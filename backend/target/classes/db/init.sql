-- DevSync Database Initialization
CREATE DATABASE IF NOT EXISTS devsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE devsync;

-- Tables are auto-created by JPA's ddl-auto: update
-- This script is for initial database setup only

-- Create a backup of application.yml defaults
-- Datasource: jdbc:mysql://localhost:3306/devsync
-- Username: root
-- Password: root

-- To create a dedicated user:
-- CREATE USER 'devsync'@'localhost' IDENTIFIED BY 'devsync-password';
-- GRANT ALL PRIVILEGES ON devsync.* TO 'devsync'@'localhost';
-- FLUSH PRIVILEGES;
