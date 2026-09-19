#!/usr/bin/env bash
# ============================================================
# DevSync — generate TLS certificates for backend <-> MySQL.
#
# Creates ./certs/{ca.pem, ca-key.pem, server-cert.pem, server-key.pem}
# and ./certs/backend-truststore.p12 (PKCS12 truststore with the CA,
# for the JDBC trustCertificateKeyStoreUrl connection option).
#
# The CA key is a LOCAL secret — keep it off the repo (.gitignore)
# and out of CI. Re-run only when certificates expire.
# ============================================================
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "${CERT_DIR}"

CN="${1:-mysql.devsync.local}"
DAYS="${2:-3650}"

echo "🔐 Generating CA and server certificates in ${CERT_DIR}"
echo "   CN=${CN}  valid ${DAYS} days"

# 1. Certificate authority
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "${CERT_DIR}/ca-key.pem" \
    -out "${CERT_DIR}/ca.pem" \
    -days "${DAYS}" \
    -subj "/CN=DevSync MySQL CA"

# 2. Server key + CSR (SAN covers common local names + the compose service name)
openssl req -newkey rsa:2048 -nodes \
    -keyout "${CERT_DIR}/server-key.pem" \
    -out "${CERT_DIR}/server.csr" \
    -subj "/CN=${CN}"

cat > "${CERT_DIR}/server-ext.cnf" <<EOF
subjectAltName = DNS:${CN},DNS:mysql,DNS:localhost,IP:127.0.0.1
EOF

# 3. Sign the server cert with the CA
openssl x509 -req \
    -in "${CERT_DIR}/server.csr" \
    -CA "${CERT_DIR}/ca.pem" \
    -CAkey "${CERT_DIR}/ca-key.pem" \
    -CAcreateserial \
    -out "${CERT_DIR}/server-cert.pem" \
    -days "${DAYS}" \
    -extfile "${CERT_DIR}/server-ext.cnf"

rm -f "${CERT_DIR}/server.csr" "${CERT_DIR}/server-ext.cnf"

# 4. PKCS12 truststore for the Java client (password is "changeit" — public CA
#    material only; the truststore contains no private keys)
openssl pkcs12 -export -nokeys \
    -in "${CERT_DIR}/ca.pem" \
    -out "${CERT_DIR}/backend-truststore.p12" \
    -passout pass:changeit \
    -name "devsync-ca"

# Ownership matters more than it looks here. The MySQL container runs as an
# unprivileged user (uid 999 in mysql:8.0) and must read the server key, or TLS
# never initializes — and the backend, which connects with sslMode=VERIFY_CA,
# then refuses to start with "SSL Connection required, but not provided by
# server". A 0600 key owned by the invoking user is unreadable to that uid, so:
#   * hand the server key to the container's uid when we are root, else
#   * relax its mode, since it is bind-mounted into the container either way.
# The CA private key is never mounted read by MySQL, so it stays restricted.
chmod 755 "${CERT_DIR}"
chmod 644 "${CERT_DIR}/ca.pem" "${CERT_DIR}/server-cert.pem" "${CERT_DIR}/backend-truststore.p12"
chmod 600 "${CERT_DIR}/ca-key.pem"
if [ "$(id -u)" -eq 0 ]; then
    chown 999:999 "${CERT_DIR}/server-key.pem"
    chmod 600 "${CERT_DIR}/server-key.pem"
else
    chmod 644 "${CERT_DIR}/server-key.pem"
fi
echo "✅ Done:"
ls -1 "${CERT_DIR}"
echo ""
echo "Usage: docker compose up -d --build  (compose mounts these files)"
