mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: dev
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_tokens`
--

DROP TABLE IF EXISTS `account_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_tokens` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `used_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_token_hash` (`token_hash`),
  KEY `idx_account_token_user` (`user_id`,`token_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_tokens`
--

LOCK TABLES `account_tokens` WRITE;
/*!40000 ALTER TABLE `account_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `project_id` varchar(36) DEFAULT NULL,
  `activity_type` varchar(40) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `metadata` text,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_activities_project_created` (`project_id`,`created_at`),
  KEY `idx_activities_user_created` (`user_id`,`created_at`),
  KEY `idx_activities_type` (`activity_type`),
  KEY `idx_activities_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
INSERT INTO `activities` VALUES ('00e2c1b4-957f-4efe-8e2c-0e90ffa5ce5f','708e3bd0-73d5-4f50-97e7-9cd096610467','22fe8656-8d33-46fe-8175-51b06a966a72','PROJECT_CREATED','Project created','skilll',NULL,'2026-08-17 08:35:51.067955','2026-08-17 08:35:51.067955'),('03edfbc5-fa54-4fdd-b643-8d7992febcfa','ccb15416-8d73-4cd3-a471-b489f5ac0340','22fe8656-8d33-46fe-8175-51b06a966a72','JOIN_REQUESTED','Join request sent','skilll',NULL,'2026-08-17 08:36:34.729468','2026-08-17 08:36:34.729468'),('12390839-7ba0-43ca-ab85-b0030ab916bf','7a470379-f044-4d2e-82b8-908c3a776f0b','22fe8656-8d33-46fe-8175-51b06a966a72','MESSAGE_SENT','Message sent','Welcome to the project from the fix verification!',NULL,'2026-08-17 09:32:53.348362','2026-08-17 09:32:53.348362'),('16c5e47f-ccfa-4651-a93e-405e25897a5e','00743207-61b1-4427-b9af-c1d6c6853468','0fd4e3a3-31b2-4aa8-b954-3fe47ab5ee59','PROJECT_CREATED','Project created','Skill Swapper',NULL,'2026-08-17 08:43:42.025295','2026-08-17 08:43:42.025295'),('1f0005ea-f39d-4959-9151-087ed484cc35','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Became project owner','Ownership Smoke',NULL,'2026-08-17 11:59:22.945241','2026-08-17 11:59:22.945241'),('23a079ed-56f5-4675-b509-d122caec6c0f','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','PROJECT_CREATED','Project created','Ownership Smoke',NULL,'2026-08-17 11:58:57.077352','2026-08-17 11:58:57.077352'),('2512a3ac-14a9-4b5c-bffb-5424133edfb7','bdd16b9c-7b44-48f9-b584-d83855e6fc6b',NULL,'POST_CREATED','Post created','Live preview verification post',NULL,'2026-08-18 08:33:03.964909','2026-08-18 08:33:03.964909'),('26090872-7989-45ce-8542-8c4c0ed0d6c5','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Ownership transferred','Ownership Smoke → Owner Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','2026-08-17 11:59:22.944241','2026-08-17 11:59:22.944241'),('2aa6e7df-a2c8-4dba-af79-627bdff56feb','00743207-61b1-4427-b9af-c1d6c6853468','0fd4e3a3-31b2-4aa8-b954-3fe47ab5ee59','MESSAGE_SENT','Message sent','Welcome to the project!',NULL,'2026-08-17 08:43:49.533198','2026-08-17 08:43:49.533198'),('2eccfa94-d796-4f17-a71d-a09f4640bce7','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Ownership transferred','Ownership Smoke → Member Smoke','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','2026-08-17 11:59:21.070547','2026-08-17 11:59:21.070547'),('37267900-c1c1-40c1-9c21-0e60eb8a00ba','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','USER_LEFT_PROJECT','User removed from project','Member Smoke was removed from the project',NULL,'2026-08-17 11:59:39.451505','2026-08-17 11:59:39.451505'),('3a4a7c80-9592-420c-bad3-823127747853','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Became project owner','Ownership Smoke',NULL,'2026-08-17 11:59:21.071550','2026-08-17 11:59:21.071550'),('3d830720-b199-4493-a467-94c9244f1772','7bb317ae-62fe-4d28-81c0-52198d817729','69216961-aad7-423c-9a11-6b5ffcea293c','TASK_STARTED','Task started','Implement Login API',NULL,'2026-08-17 10:40:50.348419','2026-08-17 10:40:50.348419'),('3ebcedb0-146d-4697-bebd-2930ec856617','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'FILE_UPLOADED','File uploaded','testimg.png','/api/attachments/1f74cbc9-955f-48a0-8557-3e246257b40d/download','2026-08-18 05:42:08.716688','2026-08-18 05:42:08.716688'),('40d323e5-e504-4470-9ad6-411c6c2cbb70','00743207-61b1-4427-b9af-c1d6c6853468','22fe8656-8d33-46fe-8175-51b06a966a72','MESSAGE_SENT','Message sent','Team chat is working now! 🎉',NULL,'2026-08-17 09:35:15.627901','2026-08-17 09:35:15.627901'),('432b5a65-84f4-4e49-9aee-a35644363a9f','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'MESSAGE_SENT','Message sent','hi',NULL,'2026-08-17 08:39:32.764560','2026-08-17 08:39:32.764560'),('46d59ade-12cd-4828-8966-4e4c7da96a57','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Ownership transferred','Ownership Smoke → Member Smoke','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','2026-08-17 12:04:55.137888','2026-08-17 12:04:55.137888'),('497ef9be-6318-436f-b10a-066a89cf3873','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','OWNERSHIP_TRANSFERRED','Became project owner','Ownership Smoke',NULL,'2026-08-17 12:04:55.138880','2026-08-17 12:04:55.138880'),('6502e5eb-f81c-4d89-ad42-03c06e779496','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'POST_CREATED','Post created','nakul',NULL,'2026-08-18 05:37:54.485664','2026-08-18 05:37:54.485664'),('71604d70-e685-4776-85db-0285fb22d8e1','16c70b4d-a151-4a3e-b987-b3a078f17316',NULL,'POST_CREATED','Post created','Image post fixed',NULL,'2026-08-18 06:07:47.248453','2026-08-18 06:07:47.248453'),('72afe829-cb03-4247-b433-597f0ca4d117','708e3bd0-73d5-4f50-97e7-9cd096610467','22fe8656-8d33-46fe-8175-51b06a966a72','JOIN_APPROVED','Join request accepted','Nakul Sharma',NULL,'2026-08-17 08:37:25.243254','2026-08-17 08:37:25.243254'),('742688d8-4e3b-4dcd-8a89-e9c8b5918aba','16c70b4d-a151-4a3e-b987-b3a078f17316',NULL,'FILE_UPLOADED','File uploaded','preview-test.png','/api/attachments/c847abec-9c95-4bf2-9de1-81657929003c/download','2026-08-18 06:07:47.365108','2026-08-18 06:07:47.365108'),('75eac574-b0a7-4e8e-b1d3-280094cd7422','7bb317ae-62fe-4d28-81c0-52198d817729','69216961-aad7-423c-9a11-6b5ffcea293c','PROJECT_CREATED','Project created','Login Flow',NULL,'2026-08-17 10:40:40.189484','2026-08-17 10:40:40.189484'),('7f2c0f42-3313-430e-a362-42ed2656eb04','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','USER_JOINED_PROJECT','User joined project','c476e4c6-c96d-458f-8d62-b26de6eaa1a3',NULL,'2026-08-17 11:58:57.769321','2026-08-17 11:58:57.769321'),('859971f6-0538-4e61-b12d-47d3a07e761d','bdd16b9c-7b44-48f9-b584-d83855e6fc6b',NULL,'POST_CREATED','Post created','My first post for the actions test',NULL,'2026-08-18 06:32:17.801741','2026-08-18 06:32:17.801741'),('9d4c32ae-c60e-44c9-bf7b-e87d13ad6965','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'FILE_UPLOADED','File uploaded','WhatsApp Image 2026-06-27 at 4.18.15 PM.jpeg','/api/attachments/9932092f-1a64-4be2-b15a-b67057ab3b0c/download','2026-08-18 06:11:34.490986','2026-08-18 06:11:34.490986'),('9dea516d-dc1f-4c8e-a5b3-84d48ece955a','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'POST_CREATED','Post created','text only post',NULL,'2026-08-18 05:49:34.797289','2026-08-18 05:49:34.797289'),('9e472e7b-846e-4046-806f-0cc9af2ed82e','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'POST_CREATED','Post created','nakul',NULL,'2026-08-18 06:11:34.409393','2026-08-18 06:11:34.409393'),('a07accb3-29d3-469d-85b0-9bf42b365605','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'POST_CREATED','Post created','hahifiiaf',NULL,'2026-08-18 06:12:22.015310','2026-08-18 06:12:22.015310'),('aa0af60b-7c81-409f-ba19-1c20f28df3e7','16c70b4d-a151-4a3e-b987-b3a078f17316',NULL,'POST_CREATED','Post created','Testing image post from preview',NULL,'2026-08-18 06:05:15.011965','2026-08-18 06:05:15.011965'),('b4f2c84e-dc53-4b45-af45-db967f661cd9','7bb317ae-62fe-4d28-81c0-52198d817729','69216961-aad7-423c-9a11-6b5ffcea293c','TASK_CREATED','Task created','Implement Login API',NULL,'2026-08-17 10:40:42.469878','2026-08-17 10:40:42.469878'),('bca97682-65ea-4de3-a74e-f68562a37073','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'COMMENT_ADDED','Comment added','hhii',NULL,'2026-08-18 06:11:56.406260','2026-08-18 06:11:56.406260'),('bf7d30f8-4b66-49a4-9863-c89d7987f7c5','d90d0932-2dec-4164-97b9-429e77a2a7a0',NULL,'COMMENT_ADDED','Comment added','Comment by B',NULL,'2026-08-18 08:24:49.466064','2026-08-18 08:24:49.466064'),('c16501f4-57f6-4d35-9237-d73275bcda29','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'FILE_UPLOADED','File uploaded','photo.png','/api/attachments/9955e2ec-d574-4a19-80ee-f1b999685112/download','2026-08-18 05:49:34.994236','2026-08-18 05:49:34.994236'),('c8d77dbb-681a-4f02-846a-a4cd1078f5b1','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef',NULL,'COMMENT_ADDED','Comment added','Comment from Social User A — will delete it after',NULL,'2026-08-18 08:34:43.451953','2026-08-18 08:34:43.451953'),('db901cdd-0b4a-4b37-88ae-d0ff7a0ec9d5','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'POST_CREATED','Post created','nakul',NULL,'2026-08-18 05:37:49.051929','2026-08-18 05:37:49.051929'),('e1639685-165d-4ac3-9995-b32763640644','7bb317ae-62fe-4d28-81c0-52198d817729','69216961-aad7-423c-9a11-6b5ffcea293c','BRANCH_CREATED','Branch suggested','feature/implement-login-api-4415a71a',NULL,'2026-08-17 10:40:50.348419','2026-08-17 10:40:50.348419'),('e2d07050-04d0-440b-9306-dc73ddf16942','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'POST_CREATED','Post created','flow test post',NULL,'2026-08-18 05:39:38.892058','2026-08-18 05:39:38.892058'),('e714e4f2-e5d5-4186-b908-462e5c826219','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','USER_JOINED_PROJECT','User joined project','c476e4c6-c96d-458f-8d62-b26de6eaa1a3',NULL,'2026-08-17 12:04:14.457340','2026-08-17 12:04:14.457340'),('eeee5735-a110-4bc5-9e0c-a661700a97b5','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','a723dadb-7e0f-49d3-9f86-fa83b43508eb','PROJECT_CREATED','Project created','Scroll Test Project',NULL,'2026-08-17 06:28:11.812864','2026-08-17 06:28:11.812864'),('f39724ca-1564-41de-8d5d-a21811de8a0c','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'POST_CREATED','Post created','gsga',NULL,'2026-08-18 05:16:50.349225','2026-08-18 05:16:50.349225'),('f91c3806-1f0f-4b18-bb04-8efcaa15ffa5','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'POST_CREATED','Post created','probe',NULL,'2026-08-18 05:40:16.835804','2026-08-18 05:40:16.835804'),('ffe1d824-0d1f-4d49-9778-9eba2600201f','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef',NULL,'POST_CREATED','Post created','A post for comment testing',NULL,'2026-08-18 08:24:49.076718','2026-08-18 08:24:49.076718');
/*!40000 ALTER TABLE `activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `performed_by` varchar(36) DEFAULT NULL,
  `target_user` varchar(36) DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `device` varchar(32) DEFAULT NULL,
  `browser` varchar(32) DEFAULT NULL,
  `status` varchar(16) NOT NULL,
  `details` text,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_action_created` (`action`,`created_at`),
  KEY `idx_audit_performed_by` (`performed_by`),
  KEY `idx_audit_target_user` (`target_user`),
  KEY `idx_audit_status` (`status`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('007d3213-86db-4e14-9436-79fd49fcd4e6','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: owner1786967852@dev.com','2026-08-17 11:57:34.113323','2026-08-17 11:57:34.113323'),('02132644-6d39-4cd4-b225-6fb7d47f33dd','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chat_owner@test.dev','2026-08-17 08:47:13.626457','2026-08-17 08:47:13.626457'),('0260aec1-1c64-4617-bd09-929c346403fc',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakusharma@gmail.com: Invalid email or password','2026-08-18 13:01:03.771434','2026-08-18 13:01:03.771434'),('02e337e2-1eda-4241-8d36-718690124dc5','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 05:45:05.091691','2026-08-18 05:45:05.091691'),('043e76ac-59ae-4234-9784-51f9496734e1','7a470379-f044-4d2e-82b8-908c3a776f0b','7a470379-f044-4d2e-82b8-908c3a776f0b','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chatfix@test.dev','2026-08-17 09:32:33.835036','2026-08-17 09:32:33.835036'),('06100649-a52c-40ff-b69e-6341963e4a97',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for tushardhiman@gmail.com: Invalid email or password','2026-08-17 06:19:54.516379','2026-08-17 06:19:54.516379'),('0a6cc7ee-f13e-4835-90ca-b625e4cf5ea9','2bc541bd-0041-446d-bbe2-612c5222b16f','2bc541bd-0041-446d-bbe2-612c5222b16f','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: ratetesta@test.com','2026-08-18 09:09:54.828255','2026-08-18 09:09:54.828255'),('0ada990d-0730-4f51-8e07-63320f506c21','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:27:05.002894','2026-08-18 12:27:05.002894'),('0e0a15da-6045-4ee9-85a7-1e3392affa69','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for social-a@test.dev','2026-08-18 08:34:15.825716','2026-08-18 08:34:15.825716'),('0e44be39-7e70-4d7c-b2ec-f27b2d2f0f6c','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 05:29:55.979339','2026-08-18 05:29:55.979339'),('0f89619f-a703-4e69-afc8-22d7383357be','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 08:49:04.974239','2026-08-18 08:49:04.974239'),('100dc093-d6e3-401e-bc13-5fab0c1c2a62','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: member1786967852@dev.com','2026-08-17 11:57:37.580585','2026-08-17 11:57:37.580585'),('12b4366d-755c-4cf9-b3bd-ac64a75bf093','7bb317ae-62fe-4d28-81c0-52198d817729','7bb317ae-62fe-4d28-81c0-52198d817729','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for flow_owner@test.dev','2026-08-17 10:48:13.204757','2026-08-17 10:48:13.204757'),('143ee8a2-7225-4602-9cb9-070c8912cb5e','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 13:01:02.788471','2026-08-17 13:01:02.788471'),('15f7aeb0-5493-4a08-ba62-cd4efacac9f3','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 13:16:17.402196','2026-08-17 13:16:17.402196'),('160a6e87-f1af-4040-b914-7f69d6cdf9d8','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:55:05.007353','2026-08-18 09:55:05.007353'),('1736a56e-de4d-4427-bdd7-97cf5072fc83','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for modal1786947963@devsync.test','2026-08-17 06:26:04.582041','2026-08-17 06:26:04.582041'),('1792eeef-d4bc-40d7-b5d1-71d8ef9203ec','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-17 09:32:17.949370','2026-08-17 09:32:17.949370'),('190a9f26-8307-44ff-a5cc-5c54f62c8f5a','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-17 11:01:58.093111','2026-08-17 11:01:58.093111'),('1ac737f8-63a3-4c75-b79b-44da9b614257','7a470379-f044-4d2e-82b8-908c3a776f0b','7a470379-f044-4d2e-82b8-908c3a776f0b','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: chatfix@test.dev','2026-08-17 09:32:32.844133','2026-08-17 09:32:32.844133'),('1b0bc17a-673c-4b91-861a-3c1728786a1e','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:09:05.539299','2026-08-18 09:09:05.539299'),('1b6e6214-8013-4647-9533-26bc1b79691f','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:24:08.616451','2026-08-18 09:24:08.616451'),('1c1e3a6a-6676-44af-8f30-e90fc93731e0','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 05:45:05.147695','2026-08-18 05:45:05.147695'),('1d2643e5-8b2b-446f-914b-7df46355c198','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-17 09:32:12.880908','2026-08-17 09:32:12.880908'),('1d39304c-d6c3-443d-ba59-f3bf98ec6c98','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:15:25.910699','2026-08-18 06:15:25.910699'),('1f00bbe3-d7e1-4498-8872-edd67992f7e6','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for modal1786947963@devsync.test','2026-08-17 08:44:13.517448','2026-08-17 08:44:13.517448'),('1f06cabc-f88e-4aec-b443-0a36deebbc0d','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for owner1786967852@dev.com','2026-08-17 11:57:50.513729','2026-08-17 11:57:50.513729'),('21282391-c38b-4461-a005-8417d5526323',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Unknown','FAILURE','Failed login attempt for nouserhere123: Invalid email or password','2026-08-17 11:57:52.618608','2026-08-17 11:57:52.618608'),('228e62a5-5682-4485-b6e1-f8094ef5e30d','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','REGISTER','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','New account registered: feedtester01@example.com','2026-08-18 06:31:51.853767','2026-08-18 06:31:51.853767'),('26494162-83ee-477a-af8e-a49bbde85535','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:15:25.909490','2026-08-18 06:15:25.909490'),('2d965199-b07e-4705-a739-5722e00a977e','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: chat_owner@test.dev','2026-08-17 08:43:36.125990','2026-08-17 08:43:36.125990'),('2e6934eb-e9ee-4ebf-8e2e-cbfb3fd33956','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for chat_owner@test.dev','2026-08-17 09:32:28.931200','2026-08-17 09:32:28.931200'),('30366729-ce66-4e40-9a8f-de2583ef8574','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','REGISTER','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','New account registered: preview.tester4@example.com','2026-08-18 05:12:28.239928','2026-08-18 05:12:28.239928'),('3395a5b5-6701-4ccf-8c10-ccd4d5b3dcbb','cf8ffbc3-5684-4576-aa77-43823cab76c8','cf8ffbc3-5684-4576-aa77-43823cab76c8','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: viewer1787031886@test.com','2026-08-18 05:44:46.951401','2026-08-18 05:44:46.951401'),('36cdf341-380e-4489-99f7-93ba8cec41fd',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-17 09:55:57.284216','2026-08-17 09:55:57.284216'),('384b9882-32ef-4c77-a29e-c2907ca67a09','7bb317ae-62fe-4d28-81c0-52198d817729','7bb317ae-62fe-4d28-81c0-52198d817729','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: flow_owner@test.dev','2026-08-17 10:40:32.426201','2026-08-17 10:40:32.426201'),('3b776b90-39e1-4f48-a365-c482daa4139d','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for social-a@test.dev','2026-08-18 08:21:55.478233','2026-08-18 08:21:55.478233'),('3b970da5-fe8d-45c1-b746-d1fbde09001e','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:57:30.122740','2026-08-18 05:57:30.122740'),('3d28722c-b85f-4f7a-9f3f-5dfc08f4fc9b',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakusharma@gmail.com: Invalid email or password','2026-08-18 13:01:03.654270','2026-08-18 13:01:03.654270'),('3f4467ff-0c2b-41a6-806c-e0c091a821ba',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-17 11:04:12.584882','2026-08-17 11:04:12.584882'),('403158ba-0cc9-46fa-80e2-b28c3dba4ac2','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:27:30.376828','2026-08-18 05:27:30.376828'),('4079ea2d-b4a1-4698-bdcc-411e7bf09bb8','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for tushardhiman@gmail.com','2026-08-17 08:35:30.864451','2026-08-17 08:35:30.864451'),('43143ddc-944c-4f3c-9183-7dd89c426b7a','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 06:27:05.069275','2026-08-18 06:27:05.069275'),('4789d0a4-6cf8-4736-b0ed-6a42c046e64e','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for owner1786967852@dev.com','2026-08-17 11:58:21.672287','2026-08-17 11:58:21.672287'),('49e4cc75-6307-47bc-9f9c-7e0662ee36e6','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','REGISTER','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','New account registered: nakulsharma978397@gmail.com','2026-08-17 06:22:25.054042','2026-08-17 06:22:25.054042'),('4b3c9f8a-28f0-4bb5-8043-64b8eb242c08','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for tushar97','2026-08-18 05:14:41.056082','2026-08-18 05:14:41.056082'),('4b8e1caa-aed9-44d4-b400-04bf2f7c2c7d','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:32:05.140973','2026-08-18 06:32:05.140973'),('4bd3419f-1945-411f-967e-b412fdf985d5','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-18 05:14:02.201736','2026-08-18 05:14:02.201736'),('4c500043-846f-4c9b-ab73-e2bc9ad93dd3',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:21:21.721001','2026-08-17 06:21:21.721001'),('4da47580-659f-4073-9590-b57a21c0df7a','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for feedtester01@example.com','2026-08-18 08:31:30.044672','2026-08-18 08:31:30.044672'),('52dc1b5c-d16b-4576-809c-b41cec67aa84','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 05:52:05.200313','2026-08-18 05:52:05.200313'),('55c0a2cb-a408-419d-9783-ef7caa943688','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 06:27:05.084272','2026-08-18 06:27:05.084272'),('57852328-aba4-436f-b9f4-3d6aa3c3d2f5','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:00:05.537560','2026-08-18 06:00:05.537560'),('578d9c78-9d05-49bc-a92e-2c720a599574','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 08:49:04.970669','2026-08-18 08:49:04.970669'),('597d65e6-d493-41af-8cf2-f163b916f325','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 11:57:19.028184','2026-08-17 11:57:19.028184'),('5a621c9e-87d5-49bc-8b3b-f9068005c241',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakulsharma978397@gmail.com: Invalid email or password','2026-08-17 06:21:33.909498','2026-08-17 06:21:33.909498'),('5b22166a-9985-4faa-8179-1440ae400c2b','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 08:03:05.196777','2026-08-18 08:03:05.196777'),('5b58187b-9ffb-4972-992e-f3b540a44277','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:45:44.796380','2026-08-17 12:45:44.796380'),('5b8b94ee-703e-42d5-8f5c-704ebe0bcd66','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:32:05.172873','2026-08-18 06:32:05.172873'),('5cc96377-ec89-4a21-acbd-99943f5de5fd','7a3e7b7d-a022-4781-8b07-8b8642b15571','7a3e7b7d-a022-4781-8b07-8b8642b15571','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: feedflow1787031578@test.com','2026-08-18 05:39:38.774702','2026-08-18 05:39:38.774702'),('5d4a37a4-018f-4d6e-8ed3-3dd9976a0a04','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','REGISTER','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','New account registered: tushardhiman@gmail.com','2026-08-17 06:22:05.733253','2026-08-17 06:22:05.733253'),('68b3614b-78a5-4e3d-bd95-aa48aeb123e8','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:29:18.418502','2026-08-17 12:29:18.418502'),('697fb753-d064-4f8d-ae1d-1d73b021ffff','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-17 06:37:15.558785','2026-08-17 06:37:15.558785'),('6aee7eb0-1b1e-4f71-b917-5b774d39f78b','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for feedtester01@example.com','2026-08-18 06:34:07.153569','2026-08-18 06:34:07.153569'),('704b16d1-f3a6-4e70-a24f-94bcf5bfc549',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:19:07.636069','2026-08-17 06:19:07.636069'),('70a804c4-7d2c-4922-b541-edf3dd6facc9','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:42:30.143845','2026-08-18 05:42:30.143845'),('715345a3-a31e-4f33-920e-3136e6f38f86','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for tushardhiman@gmail.com','2026-08-18 12:21:38.235828','2026-08-18 12:21:38.235828'),('74b4eea9-ac68-40e9-9837-c3726caffb3a','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:13:17.545566','2026-08-17 12:13:17.545566'),('75602acc-a202-4e98-8da1-4ede654bd96c','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:09:05.562326','2026-08-18 09:09:05.562326'),('75d7c5e8-2aaf-4cdd-a368-8c249ccaeb7f','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for ownersmoke1786967852','2026-08-17 12:03:49.982650','2026-08-17 12:03:49.982650'),('76969bdf-f076-4e07-831b-eb57912560d6',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for admin@devsync.com: Invalid email or password','2026-08-18 12:16:59.766365','2026-08-18 12:16:59.766365'),('791db234-8b44-46aa-83b6-f191c70411cc',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakulsharma978397@gmail.com: Invalid email or password','2026-08-17 06:19:19.336328','2026-08-17 06:19:19.336328'),('7aa2f053-b9cb-4e6e-bb2e-36919de8e0d5',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 05:29:05.054839','2026-08-18 05:29:05.054839'),('7cefbe5d-9a09-4a52-9a49-012132f8cfae','d90d0932-2dec-4164-97b9-429e77a2a7a0','d90d0932-2dec-4164-97b9-429e77a2a7a0','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: social-b@test.dev','2026-08-18 08:21:43.811638','2026-08-18 08:21:43.811638'),('7e550b9c-5652-4cbc-9694-15b683097bcd','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma@gmail.com','2026-08-18 13:01:03.739642','2026-08-18 13:01:03.739642'),('7ec2c19d-6956-4d0d-b00c-13b5c489647b','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 06:38:15.047327','2026-08-17 06:38:15.047327'),('7f407f1c-88ef-42c2-b61a-bfb2c24cb98d',NULL,NULL,'LOGOUT','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','User logged out','2026-08-18 12:27:30.097143','2026-08-18 12:27:30.097143'),('806cdd88-27c0-4b32-a04d-017bb67ac44d','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:45:23.622179','2026-08-17 12:45:23.622179'),('814f637f-ec64-46cb-95d1-feec6415e9b2',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:18:51.165659','2026-08-17 06:18:51.165659'),('821d9180-4894-41da-bbe9-144ad2f5fd55','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for chat_owner@test.dev','2026-08-17 08:44:45.058415','2026-08-17 08:44:45.058415'),('847bd966-0ab4-4e21-b77b-92231d677d44','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 07:47:44.690169','2026-08-18 07:47:44.690169'),('851fcff8-eedf-456e-8857-8252fe6117ec',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakulsharma978397@gmail.com: Invalid email or password','2026-08-17 06:21:21.635995','2026-08-17 06:21:21.635995'),('8520547e-de68-4748-9777-195ea2c6510b',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 05:52:05.299018','2026-08-18 05:52:05.299018'),('852ce41a-8c00-4901-a095-d95b2cb539fa','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 08:03:05.228027','2026-08-18 08:03:05.228027'),('86f359db-68a6-4793-a9d1-7d5c164b4098',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakulsharma978397@gmail.com: Invalid email or password','2026-08-17 06:19:07.553072','2026-08-17 06:19:07.553072'),('8874d02a-e0a6-441a-bd0d-614ba489f9ee','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:24:08.679431','2026-08-18 09:24:08.679431'),('896a524b-ce8c-458c-b6fc-fd9a9c8a8dc4','7a3e7b7d-a022-4781-8b07-8b8642b15571','7a3e7b7d-a022-4781-8b07-8b8642b15571','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for feedflow1787031578@test.com','2026-08-18 06:04:17.025103','2026-08-18 06:04:17.025103'),('8b2eeb76-c3c9-4da8-8aef-02902774d637',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:18:43.738313','2026-08-17 06:18:43.738313'),('8b69a755-6564-40b6-9f12-5ce218d692b0','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 13:16:17.419192','2026-08-17 13:16:17.419192'),('8bb84829-8231-45d6-b778-a94f7ce5563d','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 07:47:44.705795','2026-08-18 07:47:44.705795'),('8d0dc77c-6c00-440f-a234-b59d17bfd0c9','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:27:30.384827','2026-08-18 05:27:30.384827'),('8e372186-c41d-4b6f-aacb-253fb1d93cca','7a470379-f044-4d2e-82b8-908c3a776f0b','7a470379-f044-4d2e-82b8-908c3a776f0b','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chatfix@test.dev','2026-08-17 09:32:39.903903','2026-08-17 09:32:39.903903'),('8fbf79ca-ccce-437e-bceb-673546998b41','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for feedtester01@example.com','2026-08-18 08:31:30.060674','2026-08-18 08:31:30.060674'),('90433bd3-b972-4f6c-b15b-697be73a0b0c','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chat_owner@test.dev','2026-08-17 08:43:41.452389','2026-08-17 08:43:41.452389'),('92971b71-66df-49d6-9e48-b7afcf0a9daf','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-18 05:36:49.048704','2026-08-18 05:36:49.048704'),('96bdb989-d297-4cf2-b91d-97e4740dcd2a','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 06:12:33.082611','2026-08-18 06:12:33.082611'),('97184080-2fe7-4c8a-859e-702ce4d501e0','7bb317ae-62fe-4d28-81c0-52198d817729','7bb317ae-62fe-4d28-81c0-52198d817729','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for flow_owner@test.dev','2026-08-17 11:04:12.558176','2026-08-17 11:04:12.558176'),('99167661-7419-4d59-8b47-a3fc09eff9b0','48356923-3da4-46e0-8135-3b2d1fc983cf','48356923-3da4-46e0-8135-3b2d1fc983cf','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: attacker1787034833@test.com','2026-08-18 06:33:53.447708','2026-08-18 06:33:53.447708'),('9b85ff3b-7f4a-49d3-b153-0fe6ba674c30','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:39:14.899597','2026-08-18 09:39:14.899597'),('9c77f6c7-b61c-4b19-8d10-49ff6afd7df0','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 08:18:23.963213','2026-08-18 08:18:23.963213'),('a4da2f8e-7b5a-4510-84bc-e586b8c79f56','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chat_owner@test.dev','2026-08-17 08:43:49.348183','2026-08-17 08:43:49.348183'),('a4f91b27-c08f-47ff-9e83-e374c2800a0d','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:42:04.982211','2026-08-18 12:42:04.982211'),('a52c4bae-83bc-428f-8e79-151558f7ba27',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 06:12:33.211678','2026-08-18 06:12:33.211678'),('a5957353-6c75-4561-af77-1fb0edb1a005','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: modal1786947963@devsync.test','2026-08-17 06:26:04.172720','2026-08-17 06:26:04.172720'),('a5c39ea2-2f55-499c-a957-aa56009be5d0','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for social-a@test.dev','2026-08-18 08:49:21.812465','2026-08-18 08:49:21.812465'),('a73ca522-431c-449f-9c9b-7a179494c62a',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:19:54.562352','2026-08-17 06:19:54.562352'),('a8f580d8-cfdc-40ba-b6c5-98b550cc9f95','6110d5a7-a233-4e08-ae13-d44029712d97','6110d5a7-a233-4e08-ae13-d44029712d97','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for sanity1786947531@devsync.test','2026-08-17 06:18:52.894839','2026-08-17 06:18:52.894839'),('a983ef73-a0e5-44a8-b612-292fdf694922','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 05:29:05.002466','2026-08-18 05:29:05.002466'),('aa3dad1d-eed6-4930-96b2-ae18734db0d0','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for modal1786947963@devsync.test','2026-08-17 06:26:51.596730','2026-08-17 06:26:51.596730'),('ab0aeb0f-01ae-4d63-83cb-1a64c1092150',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Unknown','FAILURE','Failed login attempt for preview.tester4@example.com: Invalid email or password','2026-08-18 06:08:14.698488','2026-08-18 06:08:14.698488'),('ad4c2692-bb9f-45f3-9bbc-75b11872f28b','597f3a0a-d4bd-4041-b344-dc7815013c64','597f3a0a-d4bd-4041-b344-dc7815013c64','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: preview.tester2@example.com','2026-08-18 05:10:27.289684','2026-08-18 05:10:27.289684'),('adca4017-a9aa-401a-9e4c-7e554c7e9487','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 05:29:55.963339','2026-08-18 05:29:55.963339'),('ae846e89-5508-4b43-bac9-22ae19bfb3d4','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for owner1786967852@dev.com','2026-08-17 12:19:16.548600','2026-08-17 12:19:16.548600'),('ae9f61d3-5b49-425f-a67b-ed96dac7b6f7',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 08:49:21.880110','2026-08-18 08:49:21.880110'),('afd46457-9fdf-4a9b-856b-45d3444af043',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 08:18:24.021104','2026-08-18 08:18:24.021104'),('b022bc6b-5122-4828-bf31-5eb2a64e2391','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-17 06:37:15.632091','2026-08-17 06:37:15.632091'),('b04fede6-ab89-40cb-90a1-e6c3d3c9526e','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma@gmail.com','2026-08-18 13:01:13.684439','2026-08-18 13:01:13.684439'),('b12bc356-0932-42f9-a845-49f0ef735452',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Unknown','FAILURE','Failed login attempt for ownersmoke1786967852: Invalid email or password','2026-08-17 11:57:53.826537','2026-08-17 11:57:53.826537'),('b1894a47-cc19-4870-852f-de68effb1ec3',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:18:51.168658','2026-08-17 06:18:51.168658'),('b32b8381-9788-475a-8a78-27f83f620b8b','d90d0932-2dec-4164-97b9-429e77a2a7a0','d90d0932-2dec-4164-97b9-429e77a2a7a0','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for social-b@test.dev','2026-08-18 08:21:55.746500','2026-08-18 08:21:55.746500'),('b59997b1-6c70-4167-bd28-ba64a6aeeb92','7a470379-f044-4d2e-82b8-908c3a776f0b','7a470379-f044-4d2e-82b8-908c3a776f0b','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chatfix@test.dev','2026-08-17 09:32:52.385227','2026-08-17 09:32:52.385227'),('b6a9e06c-bb26-45b1-a316-a19a89c44c36',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Unknown','FAILURE','Failed login attempt for preview.tester4@example.com: Invalid email or password','2026-08-18 06:08:24.716783','2026-08-18 06:08:24.716783'),('b83ed870-81d3-4dc7-9c2f-c6cddf70799b','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:45:23.997452','2026-08-17 12:45:23.997452'),('bb0ed183-8384-4bfe-b377-1e4c7159bd9f','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-18 06:11:14.780013','2026-08-18 06:11:14.780013'),('bb6e2236-3b86-46a6-be30-3528b20dcf37','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma@gmail.com','2026-08-18 12:43:04.705198','2026-08-18 12:43:04.705198'),('bbb6c95a-c32f-4348-8845-9dbec04266d2','96279d89-e856-4534-b299-34505a852e2e','96279d89-e856-4534-b299-34505a852e2e','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: preview.tester3@example.com','2026-08-18 05:11:40.245561','2026-08-18 05:11:40.245561'),('bbe21abc-fa41-44b5-b173-b505a38132d9','1251cd8b-c490-4926-be00-431a093b4fa4','1251cd8b-c490-4926-be00-431a093b4fa4','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: ratetestb@test.com','2026-08-18 09:09:59.419456','2026-08-18 09:09:59.419456'),('bc1e92d4-86e8-4b26-b0e5-4b1a19cfcff3','b7eaa586-6450-4e65-8f3f-2d7f92fd7e2f','b7eaa586-6450-4e65-8f3f-2d7f92fd7e2f','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: ratetestc@test.com','2026-08-18 09:10:08.359382','2026-08-18 09:10:08.359382'),('bcf55a36-4217-42e6-a003-1abaac2e1544','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:57:30.135192','2026-08-18 05:57:30.135192'),('bedd7c84-c096-4fca-9b36-2cddb7a092f8','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for member1786967852@dev.com','2026-08-17 11:58:47.397068','2026-08-17 11:58:47.397068'),('c2e0ab2b-a65c-4ae6-a342-3ede55916d45',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:21:33.943495','2026-08-17 06:21:33.943495'),('c7008992-4371-41c8-b80e-b7daa0435558','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: social-a@test.dev','2026-08-18 08:21:43.536361','2026-08-18 08:21:43.536361'),('c8e16f76-6180-42e2-995a-b9b0b7360cd4','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for chat_owner@test.dev','2026-08-17 09:55:57.221213','2026-08-17 09:55:57.221213'),('ca7c4adf-7791-410d-a7ed-86502fe8a982','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 09:32:12.452949','2026-08-17 09:32:12.452949'),('cc050a14-0a5e-4665-bd69-9cc2b773f503','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for owner1786967852@dev.com','2026-08-17 12:19:16.561598','2026-08-17 12:19:16.561598'),('cf5bfdaf-989e-40e9-990c-68880747a668','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:57:08.896224','2026-08-18 12:57:08.896224'),('cf8576b7-fc79-4f0a-a0d8-b21c7908e137','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for chat_owner@test.dev','2026-08-17 09:32:28.945206','2026-08-17 09:32:28.945206'),('d035984f-d447-4729-8ac5-714e69901fde','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:57:08.901215','2026-08-18 12:57:08.901215'),('d330a48f-7225-4262-886a-1dadcf9759ed','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for modal1786947963@devsync.test','2026-08-17 08:44:13.488451','2026-08-17 08:44:13.488451'),('d4534a00-68fb-4758-b042-4b2e907c898a','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma@gmail.com','2026-08-18 12:27:45.920746','2026-08-18 12:27:45.920746'),('d5477fd9-c3ee-4fc2-98fc-4273fa6d1214','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 13:01:02.642347','2026-08-17 13:01:02.642347'),('d75b597b-44a8-4cd4-bd34-7070167d956e','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-17 08:35:07.603125','2026-08-17 08:35:07.603125'),('d883dd30-94d9-437c-91ae-4aae6c836cf0','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:42:04.976210','2026-08-18 12:42:04.976210'),('dc856376-5101-4c49-92f8-b085f4a2945a','00743207-61b1-4427-b9af-c1d6c6853468','00743207-61b1-4427-b9af-c1d6c6853468','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for chat_owner@test.dev','2026-08-17 08:48:01.814878','2026-08-17 08:48:01.814878'),('dec16031-adcc-4d50-ae7f-bbd8cb2b4e05','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-18 08:33:21.708676','2026-08-18 08:33:21.708676'),('dee1e248-8478-439f-a723-a2a092308941',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 07:47:44.987042','2026-08-18 07:47:44.987042'),('e026dae5-dfd2-44eb-8a41-73cd04348641','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for ownersmoke1786967852','2026-08-17 11:57:52.122149','2026-08-17 11:57:52.122149'),('e1932ea4-087e-42e5-bef5-9faa7988164b','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakulsharma978397@gmail.com','2026-08-18 12:11:28.565786','2026-08-18 12:11:28.565786'),('e1aa9a67-28d8-4709-b85f-a7c16b002cd8','98a24954-6ad4-42c7-8ae2-46ae2b6229d6','98a24954-6ad4-42c7-8ae2-46ae2b6229d6','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: feedtest21787031573@test.com','2026-08-18 05:39:33.800511','2026-08-18 05:39:33.800511'),('e2c72061-70f8-4a17-a8e4-3fc0a10d0d5f','cdee0700-8674-4ece-9449-fde685ab514b','cdee0700-8674-4ece-9449-fde685ab514b','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: feedtest1787031569@test.com','2026-08-18 05:39:29.579057','2026-08-18 05:39:29.579057'),('e33b11a3-9d50-4700-9d36-6767af0c2109','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for owner1786967852@dev.com','2026-08-17 11:58:42.494327','2026-08-17 11:58:42.494327'),('e4c9784e-13df-46b0-970d-2350541d7a6f','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 09:39:14.882760','2026-08-18 09:39:14.882760'),('e5b615ff-cf01-48a2-a935-220a7efaeb37',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:18:43.722515','2026-08-17 06:18:43.722515'),('e69802a0-a9ef-4425-96c3-22b5a6c23a72','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 09:32:12.452949','2026-08-17 09:32:12.452949'),('e886fa5a-d94a-4608-8c96-ce12b5d59e8f','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:13:20.080182','2026-08-17 12:13:20.080182'),('eba0cf2a-f9e7-46d8-822e-8ca8f19b695a','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:29:18.403499','2026-08-17 12:29:18.403499'),('ec5a2bf7-6d98-48f2-8833-21f004240be4','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 07:47:44.908923','2026-08-18 07:47:44.908923'),('ec74545d-c4c1-45ca-8111-9c0b09c07339','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-18 12:27:04.967035','2026-08-18 12:27:04.967035'),('eea58764-1be6-442a-ae80-35b744d0fecf',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Unknown','FAILURE','Failed login attempt for feedtester01@test.com: Invalid email or password','2026-08-18 09:09:50.827694','2026-08-18 09:09:50.827694'),('f3359e85-68f0-4b58-ada1-2c6ae7cf51d2','708e3bd0-73d5-4f50-97e7-9cd096610467','708e3bd0-73d5-4f50-97e7-9cd096610467','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for tushardhiman@gmail.com','2026-08-18 06:00:05.558559','2026-08-18 06:00:05.558559'),('f38a6666-43e8-480e-ba4c-ef41370593e7','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 11:57:19.026182','2026-08-17 11:57:19.026182'),('f42beb16-e7a0-41e3-b3b0-d88a10472771','6110d5a7-a233-4e08-ae13-d44029712d97','6110d5a7-a233-4e08-ae13-d44029712d97','REGISTER','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','New account registered: sanity1786947531@devsync.test','2026-08-17 06:18:51.614654','2026-08-17 06:18:51.614654'),('f478f359-83e3-4e9d-adb6-0f7bfe764f3c',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 12:43:04.748197','2026-08-18 12:43:04.748197'),('f523d184-7da7-4e0b-8aa2-78f81e81bf61',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 09:55:05.160976','2026-08-18 09:55:05.160976'),('f762e72f-2f26-4ac6-81bb-52a6103c3d47',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-17 06:19:19.400327','2026-08-17 06:19:19.400327'),('fb12d98e-d938-4294-bbf9-9569efd38615','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 12:45:44.652379','2026-08-17 12:45:44.652379'),('fc8af4bf-bec1-4e3e-bd55-9064f4ee46f9','16c70b4d-a151-4a3e-b987-b3a078f17316','16c70b4d-a151-4a3e-b987-b3a078f17316','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for preview.tester4@example.com','2026-08-18 05:42:30.127424','2026-08-18 05:42:30.127424'),('fecc3ebc-fe68-4207-a7cd-28df682921ec','ccb15416-8d73-4cd3-a471-b489f5ac0340','ccb15416-8d73-4cd3-a471-b489f5ac0340','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakulsharma978397@gmail.com','2026-08-17 06:38:15.026242','2026-08-17 06:38:15.026242');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `board_columns`
--

DROP TABLE IF EXISTS `board_columns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `board_columns` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `board_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_tasks` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bc_board_id` (`board_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `board_columns`
--

LOCK TABLES `board_columns` WRITE;
/*!40000 ALTER TABLE `board_columns` DISABLE KEYS */;
INSERT INTO `board_columns` VALUES ('1715df93-0f63-4712-ac09-22e5f3dee8d7','12da72e9-0b73-4928-85ca-c1cebf74d750','In Progress',1,NULL,NULL,'2026-08-17 08:40:00.928470','2026-08-17 08:40:00.928470'),('458ea102-6ebe-4bdc-90fc-8e306904c708','dfcfee9b-0fcc-431e-9856-0bd9c43bf4f8','In Progress',1,NULL,NULL,'2026-08-17 10:40:41.804527','2026-08-17 10:40:41.804527'),('46c279b2-5774-4fb3-94c4-6e7a80c4a4a1','dfcfee9b-0fcc-431e-9856-0bd9c43bf4f8','Done',2,NULL,NULL,'2026-08-17 10:40:41.812526','2026-08-17 10:40:41.812526'),('a430c506-e53c-4d45-9e75-226ff7dd1e34','12da72e9-0b73-4928-85ca-c1cebf74d750','To Do',0,NULL,NULL,'2026-08-17 08:40:00.928470','2026-08-17 08:40:00.928470'),('ab70e20f-ddf6-43f2-a2db-ae9883fb68d5','dfcfee9b-0fcc-431e-9856-0bd9c43bf4f8','To Do',0,NULL,NULL,'2026-08-17 10:40:41.804527','2026-08-17 10:40:41.804527'),('dd60a4b3-8c2f-4b16-9894-899d7bc19124','12da72e9-0b73-4928-85ca-c1cebf74d750','Done',2,NULL,NULL,'2026-08-17 08:40:00.928470','2026-08-17 08:40:00.928470');
/*!40000 ALTER TABLE `board_columns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `boards`
--

DROP TABLE IF EXISTS `boards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `boards` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_boards_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `boards`
--

LOCK TABLES `boards` WRITE;
/*!40000 ALTER TABLE `boards` DISABLE KEYS */;
INSERT INTO `boards` VALUES ('12da72e9-0b73-4928-85ca-c1cebf74d750','Board','22fe8656-8d33-46fe-8175-51b06a966a72','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'2026-08-17 08:40:00.928470','2026-08-17 08:40:00.928470'),('dfcfee9b-0fcc-431e-9856-0bd9c43bf4f8','Board','69216961-aad7-423c-9a11-6b5ffcea293c','7bb317ae-62fe-4d28-81c0-52198d817729',NULL,'2026-08-17 10:40:41.796527','2026-08-17 10:40:41.796527');
/*!40000 ALTER TABLE `boards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookmarks`
--

DROP TABLE IF EXISTS `bookmarks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookmarks` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bookmark` (`user_id`,`entity_type`,`entity_id`),
  KEY `idx_bookmarks_user` (`user_id`,`created_at`),
  KEY `idx_bookmarks_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookmarks`
--

LOCK TABLES `bookmarks` WRITE;
/*!40000 ALTER TABLE `bookmarks` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookmarks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feed_comments`
--

DROP TABLE IF EXISTS `feed_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_comments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_fc_post_id` (`post_id`),
  KEY `idx_fc_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feed_comments`
--

LOCK TABLES `feed_comments` WRITE;
/*!40000 ALTER TABLE `feed_comments` DISABLE KEYS */;
/*!40000 ALTER TABLE `feed_comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feed_post_likes`
--

DROP TABLE IF EXISTS `feed_post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_post_likes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_post_like` (`user_id`,`post_id`),
  KEY `idx_fpl_post_id` (`post_id`),
  KEY `idx_fpl_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feed_post_likes`
--

LOCK TABLES `feed_post_likes` WRITE;
/*!40000 ALTER TABLE `feed_post_likes` DISABLE KEYS */;
INSERT INTO `feed_post_likes` VALUES ('ab152ae9-1751-4191-8306-0fb219ae52d2','ccb15416-8d73-4cd3-a471-b489f5ac0340','507269d0-8ff4-4058-965a-4b7c0d7130e5','2026-08-18 06:11:52.004109','2026-08-18 06:11:52.004109'),('e60e4738-c965-473d-9a67-f2de0ad88799','708e3bd0-73d5-4f50-97e7-9cd096610467','3d7ff89b-ec8d-45e4-adf5-8554b4aaa5d5','2026-08-18 05:16:56.233688','2026-08-18 05:16:56.233688');
/*!40000 ALTER TABLE `feed_post_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feed_posts`
--

DROP TABLE IF EXISTS `feed_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feed_posts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TEXT',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_feed_posts_user_id` (`user_id`),
  KEY `idx_feed_posts_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feed_posts`
--

LOCK TABLES `feed_posts` WRITE;
/*!40000 ALTER TABLE `feed_posts` DISABLE KEYS */;
INSERT INTO `feed_posts` VALUES ('286b283e-2210-40b3-992f-1f41b86f9579','708e3bd0-73d5-4f50-97e7-9cd096610467','hahifiiaf',NULL,'TEXT','2026-08-18 06:12:22.015310','2026-08-18 06:12:22.015310',0),('3a9fadf3-460d-470b-aaa6-5901e3e921df','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','Live preview verification post',NULL,'TEXT','2026-08-18 08:33:03.963906','2026-08-18 08:33:03.963906',0),('507269d0-8ff4-4058-965a-4b7c0d7130e5','ccb15416-8d73-4cd3-a471-b489f5ac0340','nakul','/api/attachments/9932092f-1a64-4be2-b15a-b67057ab3b0c/download','TEXT','2026-08-18 06:11:34.409393','2026-08-18 06:11:34.601553',0);
/*!40000 ALTER TABLE `feed_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_feedback_user` (`user_id`,`created_at`),
  KEY `idx_feedback_status` (`status`),
  KEY `idx_feedback_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `file_attachments`
--

DROP TABLE IF EXISTS `file_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_attachments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploader_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `context_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `context_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_att_uploader` (`uploader_id`),
  KEY `idx_att_context` (`context_type`,`context_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_attachments`
--

LOCK TABLES `file_attachments` WRITE;
/*!40000 ALTER TABLE `file_attachments` DISABLE KEYS */;
INSERT INTO `file_attachments` VALUES ('1f74cbc9-955f-48a0-8557-3e246257b40d','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'POST','f32e9ab1-0ee1-43d7-b4f7-11a093f47290','testimg.png','3590b874-2816-441e-8216-dec99db02b26-testimg.png','image/png',2008,'/api/attachments/1f74cbc9-955f-48a0-8557-3e246257b40d/download','2026-08-18 05:42:08.713844','2026-08-18 05:42:08.724693'),('9932092f-1a64-4be2-b15a-b67057ab3b0c','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'POST','507269d0-8ff4-4058-965a-4b7c0d7130e5','WhatsApp Image 2026-06-27 at 4.18.15 PM.jpeg','b6f0846e-4968-4298-bc66-e2ccd144214b-WhatsApp_Image_2026-06-27_at_4.18.15_PM.jpeg','image/jpeg',239612,'/api/attachments/9932092f-1a64-4be2-b15a-b67057ab3b0c/download','2026-08-18 06:11:34.490986','2026-08-18 06:11:34.505301'),('9955e2ec-d574-4a19-80ee-f1b999685112','7a3e7b7d-a022-4781-8b07-8b8642b15571',NULL,'POST','bafd8737-0e3e-4bb5-9d55-171444619c75','photo.png','34f0471d-ba8c-406d-945d-49b08f1e96f2-photo.png','image/png',2008,'/api/attachments/9955e2ec-d574-4a19-80ee-f1b999685112/download','2026-08-18 05:49:34.979216','2026-08-18 05:49:35.002240'),('c847abec-9c95-4bf2-9de1-81657929003c','16c70b4d-a151-4a3e-b987-b3a078f17316',NULL,'POST','9b3c4238-8c4f-4af1-8e2f-7853ebda4688','preview-test.png','6ffedf9e-5ad8-4f6e-bea7-e5077d3735d3-preview-test.png','image/png',67,'/api/attachments/c847abec-9c95-4bf2-9de1-81657929003c/download','2026-08-18 06:07:47.365108','2026-08-18 06:07:47.383064');
/*!40000 ALTER TABLE `file_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

DROP TABLE IF EXISTS `flyway_schema_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1','init','SQL','V1__init.sql',-792530224,'root','2026-08-10 17:16:58',2274,1),(2,'2','add blocked column','SQL','V2__add_blocked_column.sql',2066074427,'root','2026-08-10 17:16:58',198,1),(3,'3','add deleted to users','SQL','V3__add_deleted_to_users.sql',-1216866379,'root','2026-08-10 17:16:58',328,1),(4,'4','add project visibility and deleted','SQL','V4__add_project_visibility_and_deleted.sql',39389866,'root','2026-08-10 17:16:59',159,1),(5,'5','create reports','SQL','V5__create_reports.sql',1749695983,'root','2026-08-10 17:16:59',620,1),(6,'6','create activity audit tables','SQL','V6__create_activity_audit_tables.sql',1530429582,'root','2026-08-10 17:17:00',265,1),(7,'7','add collaboration features','SQL','V7__add_collaboration_features.sql',-532396366,'root','2026-08-10 17:17:01',1133,1),(8,'8','add analytics and productivity','SQL','V8__add_analytics_and_productivity.sql',640210967,'root','2026-08-10 17:17:02',1286,1),(9,'9','add admin user filter indexes','SQL','V9__add_admin_user_filter_indexes.sql',891585817,'root','2026-08-10 17:17:02',174,1),(10,'10','add analytics indexes','SQL','V10__add_analytics_indexes.sql',-947004093,'root','2026-08-10 17:17:02',40,1),(11,'11','create github integration','SQL','V11__create_github_integration.sql',58392259,'root','2026-08-10 17:17:03',305,1),(12,'12','create refresh tokens','SQL','V12__create_refresh_tokens.sql',1632111455,'root','2026-08-10 17:17:03',222,1),(13,'13','create account tokens','SQL','V13__create_account_tokens.sql',147399959,'root','2026-08-11 10:09:07',317,1),(14,'14','add message read state','SQL','V14__add_message_read_state.sql',-1983082973,'root','2026-08-12 16:28:20',417,1),(15,'15','create reviews and feedback','SQL','V15__create_reviews_and_feedback.sql',-1263227183,'root','2026-08-12 17:01:11',283,1),(16,'16','create billing','SQL','V16__create_billing.sql',781473566,'root','2026-08-13 09:05:46',613,1),(17,'17','collaboration upgrades','SQL','V17__collaboration_upgrades.sql',-2122869857,'root','2026-08-13 09:05:47',873,1),(18,'18','enforce single team chat per project','SQL','V18__enforce_single_team_chat_per_project.sql',-228146413,'root','2026-08-17 09:31:38',2977,1),(19,'19','backfill team chat participants','SQL','V19__backfill_team_chat_participants.sql',-1811831550,'root','2026-08-17 09:34:19',19,1),(20,'20','add github workflow to tasks','SQL','V20__add_github_workflow_to_tasks.sql',1778887402,'root','2026-08-17 09:39:25',1427,1),(21,'21','create user follows','SQL','V21__create_user_follows.sql',1958028277,'root','2026-08-18 08:20:45',309,1);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `github_connections`
--

DROP TABLE IF EXISTS `github_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `github_connections` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `github_username` varchar(255) NOT NULL,
  `encrypted_access_token` text NOT NULL,
  `token_scopes` varchar(255) DEFAULT NULL,
  `connected_at` timestamp NOT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_github_conn_user` (`user_id`),
  KEY `idx_github_conn_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `github_connections`
--

LOCK TABLES `github_connections` WRITE;
/*!40000 ALTER TABLE `github_connections` DISABLE KEYS */;
/*!40000 ALTER TABLE `github_connections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `join_requests`
--

DROP TABLE IF EXISTS `join_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `join_requests` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_join_request` (`project_id`,`user_id`),
  KEY `idx_jr_project` (`project_id`,`status`),
  KEY `idx_jr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `join_requests`
--

LOCK TABLES `join_requests` WRITE;
/*!40000 ALTER TABLE `join_requests` DISABLE KEYS */;
INSERT INTO `join_requests` VALUES ('04bdc3af-455e-46ea-8477-c89b121000e9','22fe8656-8d33-46fe-8175-51b06a966a72','ccb15416-8d73-4cd3-a471-b489f5ac0340','APPROVED',NULL,'2026-08-17 08:36:34.696132','2026-08-17 08:37:25.243254');
/*!40000 ALTER TABLE `join_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_reactions`
--

DROP TABLE IF EXISTS `message_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reactions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emoji` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_reaction` (`message_id`,`user_id`,`emoji`),
  KEY `idx_mr_message` (`message_id`),
  KEY `idx_mr_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reactions`
--

LOCK TABLES `message_reactions` WRITE;
/*!40000 ALTER TABLE `message_reactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_reads`
--

DROP TABLE IF EXISTS `message_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reads` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_read` (`message_id`,`user_id`),
  KEY `idx_mr_user` (`user_id`),
  KEY `idx_mr_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_reads`
--

LOCK TABLES `message_reads` WRITE;
/*!40000 ALTER TABLE `message_reads` DISABLE KEYS */;
INSERT INTO `message_reads` VALUES ('22f4d835-bfa9-42d0-9e9d-6c1587831aa1','3d1aa8c4-0d2b-43a3-bd2e-9d9daeb22ede','708e3bd0-73d5-4f50-97e7-9cd096610467','2026-08-18 05:14:46.805304','2026-08-18 05:14:46.808307','2026-08-18 05:14:46.808307'),('34286171-6d89-4e31-a562-3a5064e48646','3d1aa8c4-0d2b-43a3-bd2e-9d9daeb22ede','ccb15416-8d73-4cd3-a471-b489f5ac0340','2026-08-17 11:02:04.907563','2026-08-17 11:02:04.970685','2026-08-17 11:02:04.970685'),('751edc59-b1e7-4efd-a28f-d15109244fff','f8291087-2642-4cf9-9a29-1bc03046e83b','708e3bd0-73d5-4f50-97e7-9cd096610467','2026-08-18 05:14:46.805304','2026-08-18 05:14:46.815302','2026-08-18 05:14:46.815302'),('cf214d65-da5c-4309-ad56-dc1a6d747c60','3d1aa8c4-0d2b-43a3-bd2e-9d9daeb22ede','00743207-61b1-4427-b9af-c1d6c6853468','2026-08-17 09:34:56.703377','2026-08-17 09:34:56.706375','2026-08-17 09:34:56.706375'),('e6912998-72de-4785-8961-ab8ffd8e50fa','f8291087-2642-4cf9-9a29-1bc03046e83b','ccb15416-8d73-4cd3-a471-b489f5ac0340','2026-08-17 11:02:04.907563','2026-08-17 11:02:04.974688','2026-08-17 11:02:04.974688');
/*!40000 ALTER TABLE `message_reads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receiver_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `is_system_message` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT '0',
  `attachment_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SENT',
  `read_at` datetime(6) DEFAULT NULL,
  `parent_message_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edited` tinyint(1) NOT NULL DEFAULT '0',
  `edited_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_messages_room_id` (`room_id`,`created_at`),
  KEY `idx_messages_sender_id` (`sender_id`),
  KEY `idx_messages_receiver_id` (`receiver_id`),
  KEY `idx_messages_room_created` (`room_id`,`created_at` DESC),
  KEY `idx_messages_parent` (`parent_message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES ('3d1aa8c4-0d2b-43a3-bd2e-9d9daeb22ede','7a470379-f044-4d2e-82b8-908c3a776f0b','0363eee2-aa8c-49c9-813c-f21f5445a3c3',NULL,'Welcome to the project from the fix verification!','text',0,'2026-08-17 09:32:53.334359','2026-08-17 09:32:53.334359',0,NULL,'SENT',NULL,NULL,0,NULL),('4f95d86d-1020-4e86-bc32-3f6a4c0b5df7','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'ccb15416-8d73-4cd3-a471-b489f5ac0340','hi','text',0,'2026-08-17 08:39:32.759559','2026-08-17 08:39:32.759559',0,NULL,'READ','2026-08-17 08:39:48.558751',NULL,0,NULL),('f49c397f-b6bd-4e77-81fb-bdb9d6b0e30f','00743207-61b1-4427-b9af-c1d6c6853468','122ee582-969d-4244-b17d-979dc0098e42',NULL,'Welcome to the project!','text',0,'2026-08-17 08:43:49.533198','2026-08-17 08:43:49.533198',0,NULL,'SENT',NULL,NULL,0,NULL),('f8291087-2642-4cf9-9a29-1bc03046e83b','00743207-61b1-4427-b9af-c1d6c6853468','0363eee2-aa8c-49c9-813c-f21f5445a3c3',NULL,'Team chat is working now! 🎉','text',0,'2026-08-17 09:35:15.614904','2026-08-17 09:35:15.614904',0,NULL,'DELIVERED',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `actor_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_id` (`user_id`),
  KEY `idx_notif_user_read` (`user_id`,`is_read` DESC),
  KEY `idx_notif_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES ('069eee9b-65ae-42f6-a281-a3a82c8d977d','ccb15416-8d73-4cd3-a471-b489f5ac0340','JOIN_REQUEST_APPROVED','Join request approved','Your request to join skilll was accepted','708e3bd0-73d5-4f50-97e7-9cd096610467','',NULL,'22fe8656-8d33-46fe-8175-51b06a966a72','project',1,'/projects/22fe8656-8d33-46fe-8175-51b06a966a72','2026-08-17 08:37:25.243254','2026-08-18 08:33:30.056712'),('085c4723-5a08-4446-9035-9414d81838f2','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','OWNERSHIP_TRANSFERRED','You are now the owner','You are now the owner of Ownership Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 12:04:55.130880','2026-08-17 12:04:55.130880'),('18dc993a-0328-4f8b-a0df-dc824ac4aa76','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','MEMBER_REMOVED','Removed from project','You were removed from Ownership Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:59:39.451505','2026-08-17 11:59:39.451505'),('205219d2-b865-47b8-935d-b7dadd04edef','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','OWNERSHIP_TRANSFERRED','Ownership transferred','Project ownership of Ownership Smoke was transferred to Member Smoke','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','Member Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 12:04:55.131877','2026-08-17 12:04:55.131877'),('29f7c0ed-8875-4787-af97-94a74499ad5d','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','OWNERSHIP_TRANSFERRED','Ownership transferred','Project ownership of Ownership Smoke was transferred to Owner Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:59:22.943242','2026-08-17 11:59:22.943242'),('2aedf51d-2689-493e-96e1-309525a5cf32','708e3bd0-73d5-4f50-97e7-9cd096610467','JOIN_REQUEST','Join request','Nakul Sharma requested to join your project skilll','ccb15416-8d73-4cd3-a471-b489f5ac0340','Nakul Sharma',NULL,'22fe8656-8d33-46fe-8175-51b06a966a72','project',1,'/projects/22fe8656-8d33-46fe-8175-51b06a966a72','2026-08-17 08:36:34.707546','2026-08-17 08:36:49.450937'),('58b6e102-c41c-4e43-b23a-93e6b301ca62','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','OWNERSHIP_TRANSFERRED','You are now the owner','You are now the owner of Ownership Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:59:21.067550','2026-08-17 11:59:21.067550'),('8c732f40-ae1e-475e-9723-45ca0afe2f2e','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','OWNERSHIP_TRANSFERRED','You are now the owner','You are now the owner of Ownership Smoke','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','Member Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:59:22.941239','2026-08-17 11:59:22.941239'),('925a5e07-5fa9-442d-8e54-c41e36f52c2e','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','OWNERSHIP_TRANSFERRED','Ownership transferred','Project ownership of Ownership Smoke was transferred to Member Smoke','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','Member Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:59:21.069549','2026-08-17 11:59:21.069549'),('92cc118f-9d6c-4712-8b75-979b693c9966','d90d0932-2dec-4164-97b9-429e77a2a7a0','FOLLOW','New follower','Social User A started following you.','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','Social User A',NULL,'d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','user',0,'/profile/sociala','2026-08-18 08:22:01.558470','2026-08-18 08:22:01.558470'),('b5c52114-1046-42d3-bd52-9d982ed8b281','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','MEMBER_ADDED','Added to project','Owner Smoke added you to Ownership Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 11:58:57.778316','2026-08-17 11:58:57.778316'),('e25af5d5-3c90-4ace-ad59-a5165b0294fe','708e3bd0-73d5-4f50-97e7-9cd096610467','FOLLOW','New follower','Feed Tester started following you.','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','Feed Tester',NULL,'bdd16b9c-7b44-48f9-b584-d83855e6fc6b','user',0,'/profile/feedtester01','2026-08-18 08:32:16.363357','2026-08-18 08:32:16.363357'),('e37a8c39-7ee0-46e1-95a6-4101614118bb','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','MEMBER_ADDED','Added to project','Owner Smoke added you to Ownership Smoke','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Owner Smoke',NULL,'6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','project',0,'/projects/6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','2026-08-17 12:04:14.460341','2026-08-17 12:04:14.460341');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscription_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RAZORPAY',
  `provider_payment_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_order_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_paise` bigint NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `paid_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_provider_payment` (`provider_payment_id`),
  KEY `idx_payments_user` (`user_id`,`created_at`),
  KEY `idx_payments_order` (`provider_order_id`),
  KEY `idx_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pinned_projects`
--

DROP TABLE IF EXISTS `pinned_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pinned_projects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pinned` (`user_id`,`project_id`),
  KEY `idx_pinned_user` (`user_id`,`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pinned_projects`
--

LOCK TABLES `pinned_projects` WRITE;
/*!40000 ALTER TABLE `pinned_projects` DISABLE KEYS */;
/*!40000 ALTER TABLE `pinned_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_inr` int NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `private_project_limit` int DEFAULT NULL COMMENT 'NULL = unlimited',
  `members_per_project` int NOT NULL,
  `storage_bytes` bigint NOT NULL,
  `advanced_analytics` tinyint(1) NOT NULL DEFAULT '0',
  `custom_domain` tinyint(1) NOT NULL DEFAULT '0',
  `sso` tinyint(1) NOT NULL DEFAULT '0',
  `audit_level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BASIC',
  `priority_support` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plans_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES ('plan-enterprise','ENTERPRISE','Enterprise','Unlimited scale and enterprise controls.',999,'INR',NULL,100,268435456000,1,0,0,'ADVANCED',1,1,'2026-08-13 14:35:46.083550','2026-08-13 14:35:46.083550'),('plan-free','FREE','Free','Start collaborating with core project tools.',0,'INR',2,5,1073741824,0,0,0,'BASIC',0,1,'2026-08-13 14:35:46.083550','2026-08-13 14:35:46.083550'),('plan-pro','PRO','Pro','More private projects, storage and advanced analytics.',299,'INR',20,25,53687091200,1,0,0,'FULL',1,1,'2026-08-13 14:35:46.083550','2026-08-13 14:35:46.083550');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_github_links`
--

DROP TABLE IF EXISTS `project_github_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_github_links` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `repo_id` bigint NOT NULL,
  `repo_full_name` varchar(255) NOT NULL,
  `repo_url` varchar(500) NOT NULL,
  `repo_description` varchar(1000) DEFAULT NULL,
  `repo_visibility` varchar(20) DEFAULT NULL,
  `repo_language` varchar(100) DEFAULT NULL,
  `repo_default_branch` varchar(100) DEFAULT NULL,
  `linked_by` varchar(36) NOT NULL,
  `linked_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pgl_project` (`project_id`),
  UNIQUE KEY `uk_pgl_repo` (`repo_id`),
  KEY `idx_pgl_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_github_links`
--

LOCK TABLES `project_github_links` WRITE;
/*!40000 ALTER TABLE `project_github_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_github_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_invitations`
--

DROP TABLE IF EXISTS `project_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_invitations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receiver_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inv_project` (`project_id`),
  KEY `idx_inv_receiver` (`receiver_id`,`status`),
  KEY `idx_inv_sender` (`sender_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_invitations`
--

LOCK TABLES `project_invitations` WRITE;
/*!40000 ALTER TABLE `project_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_members`
--

DROP TABLE IF EXISTS `project_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_members` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEMBER',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_member` (`project_id`,`user_id`),
  KEY `idx_pm_project_id` (`project_id`),
  KEY `idx_pm_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_members`
--

LOCK TABLES `project_members` WRITE;
/*!40000 ALTER TABLE `project_members` DISABLE KEYS */;
INSERT INTO `project_members` VALUES ('1691ea46-be8d-49bf-bc4a-7b91f3fdaf9f','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','OWNER','2026-08-17 12:04:14.449342','2026-08-17 12:04:55.140884'),('318a8959-9a18-11f1-a936-ecf4bb2b28b5','22fe8656-8d33-46fe-8175-51b06a966a72','00743207-61b1-4427-b9af-c1d6c6853468','MEMBER','2026-08-17 14:16:52.604638','2026-08-17 14:16:52.604638'),('6657c510-8edc-4c44-ac6f-c82c2ec1c799','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','MEMBER','2026-08-17 11:58:57.041350','2026-08-17 12:04:55.141879'),('72290482-9768-40a4-ac93-708a5565cb7e','a723dadb-7e0f-49d3-9f86-fa83b43508eb','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','OWNER','2026-08-17 06:28:11.812864','2026-08-17 06:28:11.812864'),('82bd0555-ac73-4d9d-9d0a-8fca2b8c77ef','22fe8656-8d33-46fe-8175-51b06a966a72','708e3bd0-73d5-4f50-97e7-9cd096610467','OWNER','2026-08-17 08:35:51.061481','2026-08-17 08:35:51.061481'),('981a77aa-9a1e-11f1-a936-ecf4bb2b28b5','22fe8656-8d33-46fe-8175-51b06a966a72','7a470379-f044-4d2e-82b8-908c3a776f0b','MEMBER','2026-08-17 15:02:41.674479','2026-08-17 15:02:41.674479'),('aae70bd8-e682-4dc8-b2c0-de887b6af046','22fe8656-8d33-46fe-8175-51b06a966a72','ccb15416-8d73-4cd3-a471-b489f5ac0340','MEMBER','2026-08-17 08:37:25.243254','2026-08-17 08:37:25.243254'),('bfe5ad39-2663-47e3-b783-31806f859a8b','0fd4e3a3-31b2-4aa8-b954-3fe47ab5ee59','00743207-61b1-4427-b9af-c1d6c6853468','OWNER','2026-08-17 08:43:42.024293','2026-08-17 08:43:42.024293'),('c86705d2-be6a-459c-a222-9824adaabcc8','69216961-aad7-423c-9a11-6b5ffcea293c','7bb317ae-62fe-4d28-81c0-52198d817729','OWNER','2026-08-17 10:40:40.139283','2026-08-17 10:40:40.139283');
/*!40000 ALTER TABLE `project_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_notes`
--

DROP TABLE IF EXISTS `project_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_notes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `yjs_state` longblob,
  `version` bigint NOT NULL DEFAULT '0',
  `updated_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_notes_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_notes`
--

LOCK TABLES `project_notes` WRITE;
/*!40000 ALTER TABLE `project_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `owner_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `repository_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `visibility` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLIC',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_projects_owner_id` (`owner_id`),
  KEY `idx_projects_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('0fd4e3a3-31b2-4aa8-b954-3fe47ab5ee59','Skill Swapper','Test project','00743207-61b1-4427-b9af-c1d6c6853468','ACTIVE',NULL,NULL,'2026-08-17 08:43:42.023293','2026-08-17 08:43:42.023293','PUBLIC',0,NULL),('22fe8656-8d33-46fe-8175-51b06a966a72','skilll','skill swapper','708e3bd0-73d5-4f50-97e7-9cd096610467','ACTIVE',NULL,NULL,'2026-08-17 08:35:51.056604','2026-08-17 08:35:51.056604','PUBLIC',0,NULL),('6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','Ownership Smoke',NULL,'c476e4c6-c96d-458f-8d62-b26de6eaa1a3','ACTIVE',NULL,NULL,'2026-08-17 11:58:57.034351','2026-08-17 12:04:55.140884','PRIVATE',0,NULL),('69216961-aad7-423c-9a11-6b5ffcea293c','Login Flow','E2E workflow test','7bb317ae-62fe-4d28-81c0-52198d817729','ACTIVE',NULL,NULL,'2026-08-17 10:40:40.131286','2026-08-17 10:40:40.131286','PUBLIC',0,NULL),('a723dadb-7e0f-49d3-9f86-fa83b43508eb','Scroll Test Project',NULL,'c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','ACTIVE',NULL,NULL,'2026-08-17 06:28:11.811864','2026-08-17 06:28:11.811864','PRIVATE',0,NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recent_searches`
--

DROP TABLE IF EXISTS `recent_searches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recent_searches` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keyword` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recent_user` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recent_searches`
--

LOCK TABLES `recent_searches` WRITE;
/*!40000 ALTER TABLE `recent_searches` DISABLE KEYS */;
/*!40000 ALTER TABLE `recent_searches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `family_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `revoked_at` datetime(6) DEFAULT NULL,
  `replaced_by` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refresh_token_hash` (`token_hash`),
  KEY `idx_refresh_user` (`user_id`),
  KEY `idx_refresh_family` (`family_id`),
  KEY `idx_refresh_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES ('00c84e14-a2bb-4115-b5bf-cce8d8a6e1be','708e3bd0-73d5-4f50-97e7-9cd096610467','7a7a315095252a49f21be6ddee36efb669968ff5f7f3eeb7ee5ac9065e185559','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 05:45:05.027697',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:45:05.028692','2026-08-18 05:45:05.028692'),('0135e53e-0ac4-4cf2-a04b-f6025142ba12','ccb15416-8d73-4cd3-a471-b489f5ac0340','972767fa29a53b3659abdf251dd08b86ee670700ebd7da665b705523f7cfd021','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:45:44.780382',NULL,'4c277deed19d35040b9d08ff752c8e4a79cbe8209a293ff2d3e40cb6b3d91451','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:45:44.780382','2026-08-17 13:01:02.531876'),('0188dd4e-5cc3-4ddc-9578-8bb42fb6ba85','7bb317ae-62fe-4d28-81c0-52198d817729','e79c83dcf12d46d167f643a47c63d307c530106b9211a47b30a7b7688ab74f68','c6d6b90c-82b6-4083-a260-d240a5dcf6c2','2026-09-16 10:40:32.322203',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 10:40:32.330203','2026-08-17 10:40:32.330203'),('0224f44f-ea40-4919-be76-00efb9eaf1fb','16c70b4d-a151-4a3e-b987-b3a078f17316','5e4af925b8775b4db0ae27e4ffc033eec88964fabfae1298278b96bc6db89955','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:57:30.104810',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:57:30.104810','2026-08-18 05:57:30.104810'),('02344a5c-72d6-4715-b47f-f4cedab7da9f','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','fa7fb1a0149b1c0b925ad7ea6c018d48193a6f4b8eb15fffad58aa5d68467518','17ced810-ae76-47bc-9209-8dce4779ecb0','2026-09-17 13:01:13.653827',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:01:13.653827','2026-08-18 13:01:13.653827'),('028fcefe-7424-4eff-b127-ecd26a01e8b5','708e3bd0-73d5-4f50-97e7-9cd096610467','d24a95a12bfaaa12318f4d630ebd81f74651381060f7423f1b002f11b648090b','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:00:05.513572',NULL,'258a65884fb4270c46384d7aeca63eb3d8b719af349cbd20cab96310ce98e659','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:00:05.514570','2026-08-18 06:15:25.893881'),('03dc525e-c12f-4327-8382-538122b77859','ccb15416-8d73-4cd3-a471-b489f5ac0340','9e71eae27eee220e0915b3376a9b4502118c0388060a59624bb87c132d349fc3','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:27:04.929038',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:27:04.930037','2026-08-18 12:27:04.930037'),('07ef294d-db0f-48ec-857a-263d41b5a4c8','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','56729dde63b149ecf04b9098c55b407204723d53adc1aef5fb4670883ca0d6b2','526b3b90-f105-41be-8f91-27a0f5a8e425','2026-09-16 11:58:21.654981',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:58:21.654981','2026-08-17 11:58:21.654981'),('0a213405-4eb8-4346-a52e-9c30f5adf132','cf8ffbc3-5684-4576-aa77-43823cab76c8','84818bbb0ddf31b52abf27a480ceffea16d423ccf920e24002d132d602f4dcc5','5af0b072-072a-413f-b935-1a98e3f43af9','2026-09-17 05:44:46.902400',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:44:46.902400','2026-08-18 05:44:46.902400'),('0c521581-db3e-4e6d-a05a-538d1e34dfb7','708e3bd0-73d5-4f50-97e7-9cd096610467','71e6d1ed9cb0b4cd0e0e4825709c1c534c9fd6dd7a1c649bbd1dbf66c2d92f9f','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 05:45:05.027697',NULL,'d24a95a12bfaaa12318f4d630ebd81f74651381060f7423f1b002f11b648090b','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:45:05.028692','2026-08-18 06:00:05.516560'),('0c5952b1-fe5a-4b8a-8a4f-91a2c7f9e303','708e3bd0-73d5-4f50-97e7-9cd096610467','6c2e7f47275dac03d3eda56d14795ff9cf217052dc72e4245d5466a6795ce6ae','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 05:14:41.041751',NULL,'1529817ce87b21b34b1b52ff8ff7c38b5cfb2e2959aa9646f95c40ad48c9241e','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:14:41.041751','2026-08-18 05:29:55.930772'),('0e46b0c3-3506-4912-9677-14b8fd809790','708e3bd0-73d5-4f50-97e7-9cd096610467','4f8394728ce0bf86c5046bac14e914a7c06398a6c70649a9e734286f22cd0e40','d6fb72b8-30db-423d-b4b0-1e651eeedabc','2026-09-16 06:37:15.518783',NULL,'682e0586c6235df8091cd18dcba50cb9ca8899e7d711643e8888e559c8212e92','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:37:15.519782','2026-08-17 06:37:15.618094'),('0f8da155-cef6-4ce1-ae3a-2a158a8b7ddf','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','58d061a181df3e490c91d085d1a1b9fad6042f170f216bd4cb80c095e99eda5c','16f5bae5-604d-4cad-afde-89f0c3fac0cd','2026-09-17 13:01:03.718770',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:01:03.719771','2026-08-18 13:01:03.719771'),('0feae4c1-3cf2-4cfa-a3d5-8f017fc9be18','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','6dc21e12d109b7fab7822b1a9a9238a08fb755d118a2409fc86c375986d9e85e','e9c54e8d-b02f-4f90-aaf5-56afb0126cc4','2026-09-16 12:19:16.520599',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 12:19:16.520599','2026-08-17 12:19:16.520599'),('1230711d-40b3-4dbb-9284-fa8006dc5c9b','ccb15416-8d73-4cd3-a471-b489f5ac0340','a7f020cff96da78325dd2f3b7e664216bd9d17059c13dd8e5a35849522a702b1','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:09:05.319253',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:09:05.381894','2026-08-18 09:09:05.381894'),('127ce911-fab3-4e90-aa6d-92c1fc5c6b0c','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','94bb2b9b6f34167c5936a148d9735a4e9ed7535b8b5a8e38242f16e799d1fb2f','44747807-59b2-4ee1-9457-2306e78694e8','2026-09-17 08:21:43.424981',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 08:21:43.426981','2026-08-18 08:21:43.426981'),('14898135-0771-4201-9912-2f2928d9d5f3','ccb15416-8d73-4cd3-a471-b489f5ac0340','96a46bb215430443d5a1e50b6645e238fc903872cc20bad1537b933aad3dad91','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 11:01:58.070339',NULL,'46699d9e0b227452c5507d48ee42fea1a1bbd7b2b498f25f02be87b97fdf2bcd','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 11:01:58.070339','2026-08-17 11:57:18.783768'),('15078255-bdd3-42c2-9bd3-f351681c698d','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','bbf54b20b9b011ddd06492d1089d8f706c2c055711e95fa38b1421867896bb88','fe5f91d4-9e20-4692-a585-8a060dfc8409','2026-09-17 06:31:51.702156',NULL,'1777eb989c95904b208328456ae447911a79e2f8cd36cd0e3fa9f9c872a78967','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 06:31:51.702156','2026-08-18 08:31:29.985260'),('182f8219-f76c-46c4-9b42-2a81e4120284','ccb15416-8d73-4cd3-a471-b489f5ac0340','4906cb6ea9fb4337a09f17fed33141ddab2af6585a8b82cc5bb8c78d97698632','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:57:08.854217',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:57:08.855216','2026-08-18 12:57:08.855216'),('1cb651c1-b889-4c9c-9495-b8e2f767ad8c','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','3218270c0c8f38424630cf0d55b920c6156bda16816c56657b14f24f43abf0b5','f9571fd4-f01b-4d58-bb79-344290adabee','2026-09-16 11:57:33.945321',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:57:33.945321','2026-08-17 11:57:33.945321'),('1ec30247-41b8-4fd4-ae5e-a88b6de7399d','ccb15416-8d73-4cd3-a471-b489f5ac0340','10a4f4acee4e8d543befef3f457f3f95198e45368a37212b949c255c8cd9365f','1fa6f92c-852b-4d0b-ad53-2d8393005194','2026-09-16 09:32:12.397572',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 09:32:12.397572','2026-08-17 09:32:12.397572'),('222ae856-46e5-4f16-ba38-92da34370466','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','cdf90e6c3de4bfdb4abc052c9abd26168c8c65627bee5528e85d58e8d8d3fb56','16f5bae5-604d-4cad-afde-89f0c3fac0cd','2026-09-17 12:43:04.652197',NULL,'58d061a181df3e490c91d085d1a1b9fad6042f170f216bd4cb80c095e99eda5c','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:43:04.653196','2026-08-18 13:01:03.720780'),('22875573-bb7e-48db-a3b4-0e7c3133e802','00743207-61b1-4427-b9af-c1d6c6853468','fa17ed97d835290aab5bf6301e10c0cc614175004c530505ff3fd1a75db1acdd','edad806e-e9b0-490d-a799-eff60d1dbe5b','2026-09-16 08:44:45.049462',NULL,'b0c45b562fa43e21d66d9558e8ab0c1234f1a19d30a38a23dbab1d591669405b','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 08:44:45.049462','2026-08-17 09:32:28.880202'),('23befd32-4a8d-474f-9cc1-d42d3239c84c','ccb15416-8d73-4cd3-a471-b489f5ac0340','fcd5251f03b677975eda5f2c150b119de233665a51557bd2172e7af315d25c67','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:45:44.552376',NULL,'972767fa29a53b3659abdf251dd08b86ee670700ebd7da665b705523f7cfd021','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:45:44.552376','2026-08-17 12:45:44.780382'),('24f30f6e-ba2b-40cc-af51-43c19c42daf5','ccb15416-8d73-4cd3-a471-b489f5ac0340','34a6a09583d8672a24d04ae92b23f949e2a9a1be000f506cff19ed9f5f24c24a','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:57:08.843216',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:57:08.843216','2026-08-18 12:57:08.843216'),('24f9b55e-ca3f-4fb3-94a1-3f8ee93ca73e','ccb15416-8d73-4cd3-a471-b489f5ac0340','8c5275ddbaf8cf8da846bd12fd85e9bf374762cd1736af69d40298c1d73eaa17','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 08:49:04.924368',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:49:04.936348','2026-08-18 08:49:04.936348'),('2537af19-ec8d-49cc-a55b-c7bf3f1e0087','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','00688649b7184c26cee4f0b17c05fd607936fcb59de0e8c6724be7e93b806aed','7edcb7db-76d0-48c7-ab13-9fde2a7950f2','2026-09-16 06:26:04.558041',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 06:26:04.558041','2026-08-17 06:26:04.558041'),('2540ca28-0b42-4d90-8d1f-bab3200d8ffe','2bc541bd-0041-446d-bbe2-612c5222b16f','cec3e4bdd78a7a41ed88efcafd0edbcd80e4cca708980261f60ac2d424fc1bda','bdcbe997-1031-4946-8619-3003fa9d6409','2026-09-17 09:09:54.775300',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 09:09:54.775300','2026-08-18 09:09:54.775300'),('25c1c146-1200-41ca-aa0d-ba363d55f3d8','cdee0700-8674-4ece-9449-fde685ab514b','2a22bfc7c612a5ea0f230e63d7fb0f4b00415b53bac0b9b80ff242865391454b','ccbd055d-ad6f-4afb-98f3-ddfa7c370dd0','2026-09-17 05:39:29.561941',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:39:29.561941','2026-08-18 05:39:29.561941'),('27b5fa83-b82f-4bda-a729-153237298c0f','ccb15416-8d73-4cd3-a471-b489f5ac0340','2349c4401737681c0a4c5728dae012ca60395d34536eaefbf912700431a09aaf','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:29:18.381502',NULL,'7b9a536ee9bb661d4930d3235ee7ca36a1e6e2b492769ee48d52c5ac8b79441e','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:29:18.381502','2026-08-17 12:45:23.528419'),('2d124c28-48ae-4706-82bf-781c5775f683','d90d0932-2dec-4164-97b9-429e77a2a7a0','13f41114374b54721f90f85bb86ea7dacc48b61c591c13d531ad930f8a9a7a85','328a7ed2-178b-4836-899c-7a2705b166d2','2026-09-17 08:21:43.795429',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 08:21:43.795429','2026-08-18 08:21:43.795429'),('2fa2a108-23e8-4f7d-b13b-db234ae6a0ea','708e3bd0-73d5-4f50-97e7-9cd096610467','034d8ab85fb5fdbc1df68800491591d35400cdf16d5ee84e3e485b19a807891d','d6fb72b8-30db-423d-b4b0-1e651eeedabc','2026-09-16 06:22:05.694263',NULL,'4f8394728ce0bf86c5046bac14e914a7c06398a6c70649a9e734286f22cd0e40','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:22:05.695264','2026-08-17 06:37:15.520786'),('321cc176-ef25-4113-81ab-075187ae86bc','00743207-61b1-4427-b9af-c1d6c6853468','689de35e73f8142be575eea39d1173f094918a6e6d02b4f04538c98b6c42a51d','91c262a6-509b-4eb3-bf39-5061cea6f4c7','2026-09-16 08:48:01.748278',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 08:48:01.764547','2026-08-17 08:48:01.764547'),('33f20fe6-f262-41db-97d3-553b48a1a59e','16c70b4d-a151-4a3e-b987-b3a078f17316','6501e64d87708ed1255e9451718a34ebe4dd6e0278f6a2e60ddccd17b08c633d','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:57:30.104810',NULL,'3aeacc0db26f07797e4a0ccf09b5e0b710df7a891a707ffcad4c0bd0ad4d4a53','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:57:30.104810','2026-08-18 06:12:33.059342'),('342f5679-2347-452b-800b-ede08b296621','ccb15416-8d73-4cd3-a471-b489f5ac0340','43397a99ec5b62af3d5b55741d02a84c5c91461b2af2e7090c836b0a7c07a0e0','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 08:49:04.924368',NULL,'a7f020cff96da78325dd2f3b7e664216bd9d17059c13dd8e5a35849522a702b1','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:49:04.936348','2026-08-18 09:09:05.438095'),('3577bd1b-0874-454f-bb59-16eaab153574','ccb15416-8d73-4cd3-a471-b489f5ac0340','9799d750ea463b46d20852613f5a0ef727de5a98df86e24fee8c088f79243212','1fa6f92c-852b-4d0b-ad53-2d8393005194','2026-09-16 09:32:12.381951',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 09:32:12.397572','2026-08-17 09:32:12.397572'),('36889859-db5f-4e17-a355-3a3b7f8fb2a9','708e3bd0-73d5-4f50-97e7-9cd096610467','323336087b120327baaaa6487f46090ac0e2d95ef641e3cf34db4034c97145c4','e4a4afce-53df-4fc5-a173-b73863878caf','2026-09-16 09:32:12.782742',NULL,'7ed0efb6c3267e153163ac79799a8f0453f320e726123473e0035c2b8766fdf4','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 09:32:12.782742','2026-08-17 09:32:17.815354'),('398d70d1-2897-4a89-a2c8-6940588b3a88','ccb15416-8d73-4cd3-a471-b489f5ac0340','f343243d807c2fc54bc21a115efac0c3de41ca227dcbb29fe2199236547f29db','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 06:27:04.979909',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:27:04.979909','2026-08-18 06:27:04.979909'),('3d32eb76-eef8-415c-bccf-5f00efb357bb','708e3bd0-73d5-4f50-97e7-9cd096610467','0caa9318ed03aa332bc63f4b72fd7f8b2ea13c6467b10419447af252d28a6bde','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 05:29:55.930772',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:29:55.930772','2026-08-18 05:29:55.930772'),('45a39176-e3a1-4469-a88e-f727e37053c2','7bb317ae-62fe-4d28-81c0-52198d817729','4d7f8cf19013d4e8d4e64d8b603f7e85347162e94e887aa75b1282ff1e4afdd1','9a01e19c-e309-48b2-8458-07fda975f29c','2026-09-16 10:48:13.188741',NULL,'8a63a1485b88f64aa6b84ea4dd0e14b83db9fd125717415f90e23b8b6110baa1','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 10:48:13.188741','2026-08-17 11:04:12.537173'),('4700f98a-a518-478e-8c26-c6d04e439d84','b7eaa586-6450-4e65-8f3f-2d7f92fd7e2f','04d8d8c53f10ef27d143f811c0906c9326a2ef835c0296e838b2ce400a2b7dc4','cd83e014-eeff-4c36-b0ce-05458db4603a','2026-09-17 09:10:08.348284',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 09:10:08.349310','2026-08-18 09:10:08.349310'),('494f48fd-f40d-49db-83d4-a1cc1ac2eb88','ccb15416-8d73-4cd3-a471-b489f5ac0340','bad6b57403d0911fd74ab4ac6ddf435118f435815844db117c9d30267c147167','2dc2003c-5d1c-4212-a062-abd0b0385cee','2026-09-16 06:38:14.999243',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:38:14.999243','2026-08-17 06:38:14.999243'),('4bf6ca76-6fdf-48f6-853d-31b383f1d1c1','ccb15416-8d73-4cd3-a471-b489f5ac0340','46699d9e0b227452c5507d48ee42fea1a1bbd7b2b498f25f02be87b97fdf2bcd','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 11:57:18.442908',NULL,'38bc1ff80b1322755c122681a531128835bace3ba8c5b6696bc36a504adbb68f','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 11:57:18.634875','2026-08-17 12:13:17.527565'),('4d5c108d-72c9-47dc-93db-680870ef7ce2','ccb15416-8d73-4cd3-a471-b489f5ac0340','1647278ac0611c26859af7f64d75cdcc84cada60a64f7564cec6e9c19c2d21ab','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:11:28.452769',NULL,'2c02d5cc6efe88bd3d2a941315252b7a4a26f8d5e98058e2981e5e7a9716ae0d','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:11:28.460633','2026-08-18 12:27:04.932040'),('4e203e65-75a7-444d-9b94-1814d74149a4','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','b063977f81d465f1ddc619f6c6dca9fc9ca4bed0e335a3cfcb84f97afffdd1c6','c9f68dd9-21b1-4e0b-b391-a5c503ad745e','2026-09-17 08:21:55.462205',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 08:21:55.463205','2026-08-18 08:21:55.463205'),('4ed6b6cb-86e6-4bac-922d-5f76175c1def','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','828c11f42aff3dae32a0f0dbe717050220ae712316500bb787387fcabea94c53','d12e3c8b-3a67-4b8c-829a-28eac09a16d1','2026-09-17 08:34:15.794465',NULL,'1e0b905620ec527228ca1ff29ac9116a6aecf6398efb01526ffa0b515ceeaefa','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 08:34:15.794465','2026-08-18 08:49:21.782995'),('523085b7-d981-4edb-b5cb-52946be6aaee','16c70b4d-a151-4a3e-b987-b3a078f17316','3aeacc0db26f07797e4a0ccf09b5e0b710df7a891a707ffcad4c0bd0ad4d4a53','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 06:12:33.059342',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 06:12:33.059342','2026-08-18 06:12:33.059342'),('5af62b31-a662-4fc4-9a22-fabe899a39e0','d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','1e0b905620ec527228ca1ff29ac9116a6aecf6398efb01526ffa0b515ceeaefa','d12e3c8b-3a67-4b8c-829a-28eac09a16d1','2026-09-17 08:49:21.782995',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 08:49:21.782995','2026-08-18 08:49:21.782995'),('5b24501e-3c04-4d14-b3bc-63762f0d4b93','98a24954-6ad4-42c7-8ae2-46ae2b6229d6','13befb2bf3463db1172cb18245377c5e407ee59ade5e0172d4b083d0109f68fe','d3f2eb2d-7e67-43c8-b8cb-0a11317f84d8','2026-09-17 05:39:33.784514',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:39:33.784514','2026-08-18 05:39:33.784514'),('6367ba04-6b48-4a1d-bd0a-af43698832cb','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','083c26107cd5b6b0bf3ae81606f9a54235cca0f848098e8a48335c8593b4d1f1','0a9301ad-0f52-43a4-a1fa-a7ccd0b5ef57','2026-09-16 08:44:13.415994',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 08:44:13.415994','2026-08-17 08:44:13.415994'),('63e761e8-5e47-42af-b74c-8f221946137b','708e3bd0-73d5-4f50-97e7-9cd096610467','258a65884fb4270c46384d7aeca63eb3d8b719af349cbd20cab96310ce98e659','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:15:25.878242',NULL,'d0a7306963c60694f122d56204c03a72afc261fa8a002fefc6b71ba92ca9119c','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:15:25.878242','2026-08-18 06:32:05.137969'),('64538835-77f5-4820-afd5-d52729a14853','7a470379-f044-4d2e-82b8-908c3a776f0b','628390786766498410b7904876a37a916e7a112a85272cf80db937e12586ce5d','b5f1cb97-07e2-48dd-a01f-35b7f366f03c','2026-09-16 09:32:33.650192',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 09:32:33.651197','2026-08-17 09:32:33.651197'),('645e4f0b-98eb-4596-8062-1db7b3336140','708e3bd0-73d5-4f50-97e7-9cd096610467','a457ef6ccef0b683fd00042c1add09a8b7b459d63529ecc703685dd6c593a1ac','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:15:25.878242',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:15:25.878242','2026-08-18 06:15:25.878242'),('652862d3-735e-431a-9eef-6de9cf2355b6','16c70b4d-a151-4a3e-b987-b3a078f17316','8e7bdd7ff8ef176a74bd726f728f55b9789bfd4d8cabfeae7d34f57ae87edaea','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:12:28.212516',NULL,'23626b7010e596e3c9c1ca781b669671e87802060af359d63202973841f0df23','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:12:28.212516','2026-08-18 05:27:30.335412'),('68818330-8e5a-4852-9a36-25a78663aba5','708e3bd0-73d5-4f50-97e7-9cd096610467','682e0586c6235df8091cd18dcba50cb9ca8899e7d711643e8888e559c8212e92','d6fb72b8-30db-423d-b4b0-1e651eeedabc','2026-09-16 06:37:15.617097',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:37:15.617097','2026-08-17 06:37:15.617097'),('68fa8c1f-8af2-4a3a-a9fa-22fa05b326d9','7a3e7b7d-a022-4781-8b07-8b8642b15571','9b76c4c783db2447293ada654055eb249f7df0ad352961e5d244165eaf83f6c3','d2502591-4d65-4bda-a184-c9f38bef1d72','2026-09-17 05:39:38.766702',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:39:38.766702','2026-08-18 05:39:38.766702'),('691cac5c-b9b0-4237-ba01-e8826f7dd50d','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','fd66f4f5f3c86b4287d0b49765692882a8714dd480eacae10b73ce7d955c5911','0abeb42e-0582-43b5-aa5c-89a76bcd7372','2026-09-16 11:57:37.555585',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:57:37.555585','2026-08-17 11:57:37.555585'),('6bbe2b27-ed77-40af-ac3c-0d390626abb2','708e3bd0-73d5-4f50-97e7-9cd096610467','ae9e5bf4c8bd9113f1edd2bec249014ea037f7c4d15a3e6c5e9afbc48064f01d','e4a4afce-53df-4fc5-a173-b73863878caf','2026-09-16 08:35:30.833199',NULL,'323336087b120327baaaa6487f46090ac0e2d95ef641e3cf34db4034c97145c4','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 08:35:30.833199','2026-08-17 09:32:12.782742'),('6ca34a57-ca22-43c4-9e34-4db734fd39a7','96279d89-e856-4534-b299-34505a852e2e','e8e479d320c86f1d0216548346fe32d958d453272bb587e493fc71d71bc6cbd9','c6efb59f-d254-4ee0-87f6-087e79272c2c','2026-09-17 05:11:40.123542',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:11:40.126540','2026-08-18 05:11:40.126540'),('6cb06a89-9b6c-48ad-9ea3-c985e6712f2c','ccb15416-8d73-4cd3-a471-b489f5ac0340','4471f5e9980b2dd877e0af8522a7364c602a86c233204ba868d61dc09a6425ab','2dc2003c-5d1c-4212-a062-abd0b0385cee','2026-09-16 06:38:15.005244',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:38:15.005244','2026-08-17 06:38:15.005244'),('72beb1ab-d77c-469d-8d1c-f2c2322c6092','ccb15416-8d73-4cd3-a471-b489f5ac0340','52bdc1988e9dd076a5fb09e893b9534c1f16ef070d07c3267028a889735e5d77','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 08:18:23.927959',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:18:23.929186','2026-08-18 08:18:23.929186'),('75a96813-8975-4568-94aa-924b7dc2a6dd','708e3bd0-73d5-4f50-97e7-9cd096610467','7ed0efb6c3267e153163ac79799a8f0453f320e726123473e0035c2b8766fdf4','e4a4afce-53df-4fc5-a173-b73863878caf','2026-09-16 09:32:17.814094',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 09:32:17.814094','2026-08-17 09:32:17.814094'),('75c33abe-98b0-4bde-bdad-4b7c21a925fa','ccb15416-8d73-4cd3-a471-b489f5ac0340','a07fecc1c264ee79ef4c154afe01c13658f6f9dbbb922ffa3638d7d9ef88589e','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 07:47:44.674545',NULL,'cd13894bb9d70ca2bd8071fcfa1d50218ce1489c1aa9d57c952b99c9f773f43b','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 07:47:44.674545','2026-08-18 08:03:05.147553'),('764bb542-1a63-451b-938e-18ca3dac172b','00743207-61b1-4427-b9af-c1d6c6853468','258790efbbd5274d1c82a0d09d6d5539f1833f4228565037ec593a05dcfde01e','a6a16f16-28c5-425e-bed4-889b17d9b301','2026-09-16 08:43:41.440788',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 08:43:41.441785','2026-08-17 08:43:41.441785'),('76f14bcb-8dec-4bd0-97d6-8a9a3ba95ff6','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','1777eb989c95904b208328456ae447911a79e2f8cd36cd0e3fa9f9c872a78967','fe5f91d4-9e20-4692-a585-8a060dfc8409','2026-09-17 08:31:29.983257',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 08:31:29.984255','2026-08-18 08:31:29.984255'),('7a5dc5a9-8164-4a88-a009-55f205672cea','ccb15416-8d73-4cd3-a471-b489f5ac0340','d7f0ad2bae0249bb8db33152c4b57282b7168227c2689d23b5222750bb5c224b','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 11:57:18.430832',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 11:57:18.634875','2026-08-17 11:57:18.634875'),('7db2d004-5bb3-4fdd-889e-517f7f7afb3a','16c70b4d-a151-4a3e-b987-b3a078f17316','23626b7010e596e3c9c1ca781b669671e87802060af359d63202973841f0df23','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:27:30.335412',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:27:30.335412','2026-08-18 05:27:30.335412'),('7fdb9705-ad1b-4204-911d-cee65f015475','ccb15416-8d73-4cd3-a471-b489f5ac0340','458dca2758a3049e0d6a7b286512eab002e427e6aff7c0fb1ac73bde340b5e5a','3ea28ae6-2dd2-45b7-8113-c09852776356','2026-09-17 05:52:05.131512',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:52:05.148294','2026-08-18 05:52:05.148294'),('7fe6c538-b41b-4a87-b4c9-655f5f16bdae','708e3bd0-73d5-4f50-97e7-9cd096610467','87afb784ce5c37682c06892305b673a9d83ec754cddc25791f04d1ff9d765368','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:32:05.102970',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:32:05.102970','2026-08-18 06:32:05.102970'),('80b8fcde-4425-46fe-ac34-c836e1886901','ccb15416-8d73-4cd3-a471-b489f5ac0340','38bc1ff80b1322755c122681a531128835bace3ba8c5b6696bc36a504adbb68f','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:13:17.525567',NULL,'327ef34793a9534e2647830bb9d57b239b883808f2fffa263b922f15a63820bc','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:13:17.526567','2026-08-17 12:13:20.064176'),('816ae785-be61-427b-9a32-516838fb5c5e','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','812284a4bc68c401c6734bb33cc90b24abcb318e8b64253f3d2d311dbf779711','fe5f91d4-9e20-4692-a585-8a060dfc8409','2026-09-17 08:31:29.797904',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 08:31:29.801904','2026-08-18 08:31:29.801904'),('82fb224d-640b-4d5f-bff0-e05fcbe33cb1','48356923-3da4-46e0-8135-3b2d1fc983cf','173faf9a923245183da4e7ce8538498183d68f14ba3da1ef2f93bc359dafb738','5ca7f35f-d8af-4445-a3a6-15d3ffd70057','2026-09-17 06:33:53.434004',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 06:33:53.434004','2026-08-18 06:33:53.434004'),('8385f9f4-e41f-42d9-ae02-a3f723b4f1f0','16c70b4d-a151-4a3e-b987-b3a078f17316','5ae1e6abaa8b7db2d28249ac3a403702c083d7d6481223dcc3d2123a7b2dd7e6','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:42:30.096357',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:42:30.107384','2026-08-18 05:42:30.107384'),('841d9187-f096-4cd6-9686-8002b0348afc','ccb15416-8d73-4cd3-a471-b489f5ac0340','cd13894bb9d70ca2bd8071fcfa1d50218ce1489c1aa9d57c952b99c9f773f43b','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 08:03:05.116299',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:03:05.131922','2026-08-18 08:03:05.131922'),('87a8f641-d3a5-4ac8-b22d-c3954b781601','ccb15416-8d73-4cd3-a471-b489f5ac0340','a0a97950303d8ec67170c5669e8c6b55cee4f471b90f6a9c53d7ff954fa7160c','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:55:04.969796',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:55:04.969796','2026-08-18 09:55:04.969796'),('898d6ef2-c3fd-43cc-93c8-c3121c09077e','ccb15416-8d73-4cd3-a471-b489f5ac0340','4d869304030b9185df49a1d75fb63866183f870df8d7515d71462dab4b519f41','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:24:08.570669',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:24:08.571668','2026-08-18 09:24:08.571668'),('8e866484-ecfe-4548-85f8-5691700f2d37','ccb15416-8d73-4cd3-a471-b489f5ac0340','ff57efabd9a6cce9a3e5b080f68b575f5a3418d9c357a9e434d6deaece5188e4','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:39:14.843140',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:39:14.843140','2026-08-18 09:39:14.843140'),('8f75446b-8f69-4ac1-a24d-9f85fc9a435c','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','4c3f90feb9b3f91442b09a47f56a91f68aeab358f8db4c1c9dede0dcb7798e20','90a5d7ea-2827-4efa-b380-f78fc1282bca','2026-09-16 06:26:04.160716',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 06:26:04.160716','2026-08-17 06:26:04.160716'),('903ba907-db4c-455d-8ce9-e7dd908fbce0','708e3bd0-73d5-4f50-97e7-9cd096610467','d0a7306963c60694f122d56204c03a72afc261fa8a002fefc6b71ba92ca9119c','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:32:05.135970',NULL,'05be3d0171b29c8130adbec339d98126be767faa195e6939e871ff38acfe96d6','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:32:05.136970','2026-08-18 07:47:44.877668'),('912f29f3-6b9a-4e29-96e5-6794f32c42e4','ccb15416-8d73-4cd3-a471-b489f5ac0340','4c277deed19d35040b9d08ff752c8e4a79cbe8209a293ff2d3e40cb6b3d91451','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 13:01:02.531876',NULL,'b8441d449ef2c79f04b51a3c47b9d3e61be9387866d6f14ee624c49caf497bdb','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 13:01:02.531876','2026-08-17 13:16:17.236943'),('9173a700-524f-497d-a5d1-8334ef4ac6b6','00743207-61b1-4427-b9af-c1d6c6853468','4f50e011b8eb7367007e3dad0065bafde5cfc5b7460d8963126de09925026a2c','edad806e-e9b0-490d-a799-eff60d1dbe5b','2026-09-16 09:55:57.172205',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 09:55:57.175202','2026-08-17 09:55:57.175202'),('973161a4-1409-4e3a-b752-6cdc5b25f788','bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','aa81669f75af72e9afe7100888043f23b8974587f92c48e5caecc3cf3cf359cd','16f5bae5-604d-4cad-afde-89f0c3fac0cd','2026-09-17 12:27:45.889754',NULL,'cdf90e6c3de4bfdb4abc052c9abd26168c8c65627bee5528e85d58e8d8d3fb56','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:27:45.890767','2026-08-18 12:43:04.654197'),('9b383745-cfca-4082-a5d1-457414f3e399','d90d0932-2dec-4164-97b9-429e77a2a7a0','54bba9ae143c484dba0854b8fd6e4cef1fc1e658d67011ca47ebc4f6cef3bc3d','b446c094-682c-486b-aba4-53810fbec671','2026-09-17 08:21:55.724291',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 08:21:55.724291','2026-08-18 08:21:55.724291'),('9c59d994-5cfd-4281-8339-86499de7f12b','7bb317ae-62fe-4d28-81c0-52198d817729','8a63a1485b88f64aa6b84ea4dd0e14b83db9fd125717415f90e23b8b6110baa1','9a01e19c-e309-48b2-8458-07fda975f29c','2026-09-16 11:04:12.535172',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 11:04:12.536172','2026-08-17 11:04:12.536172'),('9ccc93f8-cec7-4d5a-8f9b-0e53d0ba100d','7a470379-f044-4d2e-82b8-908c3a776f0b','f65b43837a694b200fc907d7972b7b1ee58a3e4eb4ff277862e7541a7d19e22a','a9721f09-cdea-4645-a578-b8e23d7536b3','2026-09-16 09:32:32.830849',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 09:32:32.830849','2026-08-17 09:32:32.830849'),('9d64305e-2df5-4d52-8ea0-92ee77b62e91','00743207-61b1-4427-b9af-c1d6c6853468','a1ef3c09bd2a976fab311470f553922d26ee9b2533fb2d73ce5d4a977757ac9c','842a8fcb-1568-4103-bf41-9c6365a48d72','2026-09-16 08:43:36.114989',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 08:43:36.115991','2026-08-17 08:43:36.115991'),('aa096397-b133-4c23-b74c-2afe04dede3b','16c70b4d-a151-4a3e-b987-b3a078f17316','a7b2b60dbaf137b3791e230fea73ab786907eaebd2a56681fe2441a59782548b','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:27:30.335412',NULL,'1138793e3ef99f19252828e4068143d0cdd035e68f3d19639d7eceb81c805f0f','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:27:30.335412','2026-08-18 05:42:30.110084'),('b267d798-2b0d-4b81-a6ca-59d0a043f420','ccb15416-8d73-4cd3-a471-b489f5ac0340','f29e62b9fe073a9bfc4be4d1deb4d628fb9aaa23930b39da86ddd0f7e1de65f1','d842ff1a-0e89-4dd1-87ec-3a61610c3496','2026-09-17 05:14:02.168410',NULL,'65ca8a25fb9659c7b2676b8a90842028fdbf13b6ea30cb1d63159fd972e67db8','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:14:02.169671','2026-08-18 05:29:04.968339'),('b2fa4ac4-0ca1-4a64-b826-078e41c4d651','ccb15416-8d73-4cd3-a471-b489f5ac0340','fe1db44e65e5f88ea5fdc4b0f74b1da28d07333a17c7e2dec3867f6b02e19e42','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:42:04.951213',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:42:04.951213','2026-08-18 12:42:04.951213'),('b3e07649-9574-4d87-ae18-96c23c40502c','ccb15416-8d73-4cd3-a471-b489f5ac0340','04fdcda242f6d6c7f3ba1d32333c28ffd3647a70fc993a9c5d177a67b4435864','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 13:01:02.470630',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 13:01:02.478374','2026-08-17 13:01:02.478374'),('b4c1eddb-6e59-44ad-8afb-dda54e4435d5','ccb15416-8d73-4cd3-a471-b489f5ac0340','327ef34793a9534e2647830bb9d57b239b883808f2fffa263b922f15a63820bc','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:13:20.062174',NULL,'2349c4401737681c0a4c5728dae012ca60395d34536eaefbf912700431a09aaf','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:13:20.063176','2026-08-17 12:29:18.384498'),('bd04b751-1aa9-49a8-b668-9e1158d00eb3','708e3bd0-73d5-4f50-97e7-9cd096610467','2f541d6dbe3f17ead426cfad247cabab341c64a90c48c33b65ccc28533372105','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 06:00:05.482559',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:00:05.482559','2026-08-18 06:00:05.482559'),('bec8e5e4-eeee-41eb-90d3-095ced659f19','ccb15416-8d73-4cd3-a471-b489f5ac0340','27681d16999e951096c151853c119da68a82d49453acea703e461a99c53a5429','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 07:47:44.674545',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 07:47:44.674545','2026-08-18 07:47:44.674545'),('bff43eb3-42e0-47cc-ab56-7caa58e429e8','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','71e879d2e4c075dd4778139d73e907561591fd43345a16980781a7f3ae0171fc','ff86bab1-6075-40eb-b065-86b325d8c3ab','2026-09-16 11:57:52.094151',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:57:52.094151','2026-08-17 11:57:52.094151'),('c0a6faa9-ae50-4a5b-97f5-8c8628cd5a5c','ccb15416-8d73-4cd3-a471-b489f5ac0340','7b9a536ee9bb661d4930d3235ee7ca36a1e6e2b492769ee48d52c5ac8b79441e','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:45:23.528419',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:45:23.528419','2026-08-17 12:45:23.528419'),('c1780868-af95-43a2-ad28-b8835f5f7402','ccb15416-8d73-4cd3-a471-b489f5ac0340','e1c38a94a115e5cf232981c1786f097e3c016d2319838330601d780766c28e92','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:42:04.950211',NULL,'4906cb6ea9fb4337a09f17fed33141ddab2af6585a8b82cc5bb8c78d97698632','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:42:04.950211','2026-08-18 12:57:08.856222'),('c19fe415-4412-496b-94b8-1d8173623f33','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','37433ba5f437fd1ce86822ddaa5646a3d6ec7ee30d9e7b6a15d2b6d986e28f0d','e9c54e8d-b02f-4f90-aaf5-56afb0126cc4','2026-09-16 12:19:16.545600',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 12:19:16.545600','2026-08-17 12:19:16.545600'),('c275ce49-4b25-4ccc-91d5-4d2494a19a91','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','9bec88cd69eb616eaa958aea57b3c43524e8a20275b45248d97c3440e4099d3c','0a9301ad-0f52-43a4-a1fa-a7ccd0b5ef57','2026-09-16 06:26:51.576727',NULL,'78fd2cce951acc3ebe6e6f3a5f265705c317c273bdfc2f8e0f64fb2fdd4fcad9','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 06:26:51.576727','2026-08-17 08:44:13.416993'),('c28548c9-b9d7-4b82-a761-3d796673b937','ccb15416-8d73-4cd3-a471-b489f5ac0340','fc6c0670a16dba1ed958cbe18cb39c602aaf866af89cbec0a35ef1277e2ab04c','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 13:16:17.227316',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 13:16:17.228316','2026-08-17 13:16:17.228316'),('c35a6ec2-03e8-4be5-8867-ecbbf8d8637d','ccb15416-8d73-4cd3-a471-b489f5ac0340','2b9043967d9bf34112d9637a663c2982e49104bc50978f2cb2f1273bf6aa0acd','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 08:33:21.692418',NULL,'43397a99ec5b62af3d5b55741d02a84c5c91461b2af2e7090c836b0a7c07a0e0','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:33:21.692418','2026-08-18 08:49:04.939345'),('c3746d8a-fb5c-479d-b3e9-dff91781d4d7','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','c9811209a1870ae95a4a12590ccd06b6d7070fa6a79918f001b88a9f70f9292c','01addd8d-3eb6-4b8a-bc3c-1028b06f9992','2026-09-16 11:58:42.416335',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:58:42.417330','2026-08-17 11:58:42.417330'),('c3a30ac8-4e8f-4524-9145-44c6091aa70b','00743207-61b1-4427-b9af-c1d6c6853468','b0c45b562fa43e21d66d9558e8ab0c1234f1a19d30a38a23dbab1d591669405b','edad806e-e9b0-490d-a799-eff60d1dbe5b','2026-09-16 09:32:28.879207',NULL,'4f50e011b8eb7367007e3dad0065bafde5cfc5b7460d8963126de09925026a2c','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 09:32:28.879207','2026-08-17 09:55:57.186210'),('c6a0dc5d-7dbe-4397-a342-4a5de114e28d','7a470379-f044-4d2e-82b8-908c3a776f0b','3c3224266105246f3169f445f2925004b8bb88b41cd47cb3aba39a6eb1735f11','7f504647-472f-40b5-998d-f94c728ea76a','2026-09-16 09:32:52.374229',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 09:32:52.374229','2026-08-17 09:32:52.374229'),('c7b97c02-3d77-45b1-85d9-7393d5ad50ad','ccb15416-8d73-4cd3-a471-b489f5ac0340','fecedf17dd3c0e9e5e1c0f36db5f968894f8531532137b83f90d8e1756ed0c39','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:29:18.376497',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:29:18.376497','2026-08-17 12:29:18.376497'),('cbd863fe-7ed5-430d-80be-479dfe21fb6b','1251cd8b-c490-4926-be00-431a093b4fa4','15686c27ce7c1f3bff653daadd46be1239c133ed5ed2fa02110570bdf068f105','b1786b9b-f9a6-44c6-a058-4a821c7ec7dd','2026-09-17 09:09:59.403156',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 09:09:59.403156','2026-08-18 09:09:59.403156'),('cfb9f141-0039-40ec-a267-b53911a0dca7','708e3bd0-73d5-4f50-97e7-9cd096610467','1529817ce87b21b34b1b52ff8ff7c38b5cfb2e2959aa9646f95c40ad48c9241e','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 05:29:55.930772',NULL,'71e6d1ed9cb0b4cd0e0e4825709c1c534c9fd6dd7a1c649bbd1dbf66c2d92f9f','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:29:55.930772','2026-08-18 05:45:05.029693'),('cfea0fbd-208b-4bb4-ba3a-f0df7efa264d','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','b6a997b4c060860e6d8780411600e7c4ec1a606dbf6cefbb55b6d88209e42e1a','e9c54e8d-b02f-4f90-aaf5-56afb0126cc4','2026-09-16 12:03:49.967026',NULL,'37433ba5f437fd1ce86822ddaa5646a3d6ec7ee30d9e7b6a15d2b6d986e28f0d','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 12:03:49.967026','2026-08-17 12:19:16.546601'),('d34252ba-424c-4e8b-82c4-1bf73a3d5015','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','df95fe47e2762e064820cf1bd60415efc85d4282f49969db60f46a76d8118f81','82dc3ef4-feed-4c90-8440-6ca4aa5857ad','2026-09-17 06:34:07.130127',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 06:34:07.131128','2026-08-18 06:34:07.131128'),('d356bdd0-45b3-4a5c-ae21-513f9ab175f2','ccb15416-8d73-4cd3-a471-b489f5ac0340','523308fbbf339287b984fb0ad04a79df9f5e325f71790a50e79d36e5b92626f2','3ea28ae6-2dd2-45b7-8113-c09852776356','2026-09-17 05:36:49.016792',NULL,'458dca2758a3049e0d6a7b286512eab002e427e6aff7c0fb1ac73bde340b5e5a','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:36:49.016792','2026-08-18 05:52:05.148294'),('d366b203-7d0d-49a1-b826-07cf4ca4aa05','ccb15416-8d73-4cd3-a471-b489f5ac0340','41506d1bfa0678cdf5428c339b5492758433117d85d62d888d7c237eaedd5046','1fa6f92c-852b-4d0b-ad53-2d8393005194','2026-09-16 08:35:07.509164',NULL,'9799d750ea463b46d20852613f5a0ef727de5a98df86e24fee8c088f79243212','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 08:35:07.518262','2026-08-17 09:32:12.406070'),('d4426e3e-91c6-49bd-a8a9-a4f773ba259a','6110d5a7-a233-4e08-ae13-d44029712d97','2d4dc5b265a4b76001ff35b5d5a1eb3b9c3120ff910a5cb8a5623981cbc5fe8b','61f8db53-7332-4550-b343-e5135d6fb720','2026-09-16 06:18:52.883838',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 06:18:52.883838','2026-08-17 06:18:52.883838'),('d45a3f2c-37a3-439d-ae64-91c9c2228182','ccb15416-8d73-4cd3-a471-b489f5ac0340','fdace79610f306c7ce7bc5c013f0afafc0923cc8602571f7fe34e3278c58773b','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:09:05.319253',NULL,'1919e3f2e5b4a8e6cf08f11890314ddf7cb9c7d052830dd65f254370fbe4f20c','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:09:05.382896','2026-08-18 09:24:08.586621'),('d4648a91-80a9-4a40-a289-7c7e25d77a95','16c70b4d-a151-4a3e-b987-b3a078f17316','1138793e3ef99f19252828e4068143d0cdd035e68f3d19639d7eceb81c805f0f','8342289f-0c56-411f-9598-6323dd1e72a0','2026-09-17 05:42:30.107384',NULL,'6501e64d87708ed1255e9451718a34ebe4dd6e0278f6a2e60ddccd17b08c633d','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-18 05:42:30.107384','2026-08-18 05:57:30.104810'),('d816add3-4741-418c-ae25-544244549290','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','34c65256568be9085174ffb4b9b18643c9adae5d6cb7aaa9ff1f0f21e8613995','c20003ac-1fd2-43e7-a261-45591e2f86ec','2026-09-16 11:57:50.488728',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:57:50.489737','2026-08-17 11:57:50.489737'),('ddf75775-42b4-407e-818d-7c80be5f5a92','ccb15416-8d73-4cd3-a471-b489f5ac0340','5391b65ba3a2515597e31f9ecae0dbda61211fb226098997773e580f9ab76851','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:39:14.852125',NULL,'a0a97950303d8ec67170c5669e8c6b55cee4f471b90f6a9c53d7ff954fa7160c','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:39:14.853126','2026-08-18 09:55:04.969796'),('e133dd56-f35d-4c2c-9188-11256d106da8','ccb15416-8d73-4cd3-a471-b489f5ac0340','92d568d68222d15415b947c386e077bfafb915143e2e09a1c86b79c39ff14fff','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 06:27:04.964281',NULL,'a07fecc1c264ee79ef4c154afe01c13658f6f9dbbb922ffa3638d7d9ef88589e','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:27:04.979909','2026-08-18 07:47:44.674545'),('e724e151-ecd0-40b1-8e49-9d414c619446','ccb15416-8d73-4cd3-a471-b489f5ac0340','65ca8a25fb9659c7b2676b8a90842028fdbf13b6ea30cb1d63159fd972e67db8','d842ff1a-0e89-4dd1-87ec-3a61610c3496','2026-09-17 05:29:04.968339',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 05:29:04.968339','2026-08-18 05:29:04.968339'),('e78f08ba-55e3-4835-ad19-d06c57c07ae9','6110d5a7-a233-4e08-ae13-d44029712d97','458ed0fd95e5e144e5a19493824a67f1350770347a616258b3603c57e7488d82','73b54def-0835-4442-bb93-5a74b7f887a1','2026-09-16 06:18:51.604656',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 06:18:51.605655','2026-08-17 06:18:51.605655'),('ea3ef8b8-0394-474d-9dc3-e6ad866598be','ccb15416-8d73-4cd3-a471-b489f5ac0340','2c02d5cc6efe88bd3d2a941315252b7a4a26f8d5e98058e2981e5e7a9716ae0d','16e7687e-c2b4-4fdb-b87f-cdd5615f2550','2026-09-17 12:27:04.931043',NULL,'e1c38a94a115e5cf232981c1786f097e3c016d2319838330601d780766c28e92','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:27:04.931043','2026-08-18 12:42:04.952212'),('f07a0cfe-b1ae-4b61-abeb-3342e74ca354','7a470379-f044-4d2e-82b8-908c3a776f0b','65089cca96349687aaffaa0515c739b833c8c592b250defcf12847fe8cd7b47f','41779265-d88d-4bad-8774-e81d2b1ef253','2026-09-16 09:32:39.889910',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 09:32:39.890906','2026-08-17 09:32:39.890906'),('f139c57e-8576-4dc0-9afb-813625207eca','c476e4c6-c96d-458f-8d62-b26de6eaa1a3','9fcf504b3ed6b0a349ced68e9d086660dfa5a8fb022939cdcdd42ef5ee904c79','8b105bbf-9dc9-4ed3-8c3d-062b255fe24c','2026-09-16 11:58:47.274929',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 11:58:47.274929','2026-08-17 11:58:47.274929'),('f13e316e-4560-4303-a03c-644b9c3d51fd','00743207-61b1-4427-b9af-c1d6c6853468','2f33ac6865d17c184f1e7e9fab3d3df357d9008b417a29359d871ea6f90d20ad','edad806e-e9b0-490d-a799-eff60d1dbe5b','2026-09-16 09:32:28.859200',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 09:32:28.860201','2026-08-17 09:32:28.860201'),('f1406b30-762f-4073-a3ff-acf68a658d1e','c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','78fd2cce951acc3ebe6e6f3a5f265705c317c273bdfc2f8e0f64fb2fdd4fcad9','0a9301ad-0f52-43a4-a1fa-a7ccd0b5ef57','2026-09-16 08:44:13.415994',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Freebuff/0.0.63 Chrome/130.0.6723.191 Electron/33.4.11 Safari/537.36','2026-08-17 08:44:13.415994','2026-08-17 08:44:13.415994'),('f35c1b33-9248-4542-8e99-d44200d1c298','ccb15416-8d73-4cd3-a471-b489f5ac0340','af6a1fb06146046ed6856333b3cb037016d43b68cba0f6058b6ac496860ef6d7','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 06:11:14.763788',NULL,'92d568d68222d15415b947c386e077bfafb915143e2e09a1c86b79c39ff14fff','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 06:11:14.763788','2026-08-18 06:27:04.979909'),('f37415df-843c-4c0a-95e1-e3776449e52d','708e3bd0-73d5-4f50-97e7-9cd096610467','9301707d02af1006f6f67984321a8569324e1fe3cc03ca75d3b02c38fcfff841','85ca6899-8bbd-40bc-97eb-93fbdf13b663','2026-09-17 12:21:38.204691','2026-08-18 12:27:30.096142',NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 12:21:38.204691','2026-08-18 12:27:30.099152'),('f561a48d-fbd7-4100-8758-8f5e4b7fa2d6','00743207-61b1-4427-b9af-c1d6c6853468','9019dfe248396fcfabc95a754dbda06b189de02e08606af72f4a21b38d1194bf','35f3f75c-6c82-4b79-9af2-972f8a90c56e','2026-09-16 08:47:13.607800',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 08:47:13.607800','2026-08-17 08:47:13.607800'),('f8694a61-2cc5-454d-946d-a876048c677e','ccb15416-8d73-4cd3-a471-b489f5ac0340','217c98b8af246a9fbfd166fbe865fc5f9a4a83025b9c808a67d2c93fab602781','d5861cb5-1b27-4373-a4cf-9ded0d1ab840','2026-09-17 08:03:05.116299',NULL,'52bdc1988e9dd076a5fb09e893b9534c1f16ef070d07c3267028a889735e5d77','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 08:03:05.131922','2026-08-18 08:18:23.930189'),('f8939a47-c8a4-4be3-8828-188d04bea6fa','708e3bd0-73d5-4f50-97e7-9cd096610467','05be3d0171b29c8130adbec339d98126be767faa195e6939e871ff38acfe96d6','d7b1d360-ec2f-4718-af62-a690fe6ec75e','2026-09-17 07:47:44.877668',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 07:47:44.877668','2026-08-18 07:47:44.877668'),('fa230833-4ab8-49d6-b566-da5acb8b73dd','7a3e7b7d-a022-4781-8b07-8b8642b15571','1455e96f24cdb73ed5b97c18589a108dffd0ddc137522f7810d8da50b198d378','0cfac5bf-1ea4-4a84-ad38-fe109118573c','2026-09-17 06:04:16.991680',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 06:04:16.991680','2026-08-18 06:04:16.991680'),('fa33bd0b-8fc4-41d0-900c-b7f98baffeea','ccb15416-8d73-4cd3-a471-b489f5ac0340','e37106966677fe5c219ce95fb2773355bf8e62c6decad4196e08e3556bc0558d','2dc2003c-5d1c-4212-a062-abd0b0385cee','2026-09-16 06:22:25.045040',NULL,'4471f5e9980b2dd877e0af8522a7364c602a86c233204ba868d61dc09a6425ab','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 06:22:25.046040','2026-08-17 06:38:15.006241'),('fa90bfc4-d337-470a-86f6-9864f6fb7e55','ccb15416-8d73-4cd3-a471-b489f5ac0340','df8dc2a4c1508334d5b3cec1293e15cce7ff544775156d92e6dfdff7e9f68fbc','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 12:45:23.528419',NULL,'fcd5251f03b677975eda5f2c150b119de233665a51557bd2172e7af315d25c67','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 12:45:23.528419','2026-08-17 12:45:44.560377'),('fadcdb96-27d6-4abf-94cc-df14e6585e96','00743207-61b1-4427-b9af-c1d6c6853468','743d9800054a3d53ab65bd75e1d30291b916668a1ca86740bb61ba1721f4b5dc','4189246b-a1d8-4e24-9b71-eafdbb28e1d0','2026-09-16 08:43:49.332544',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-17 08:43:49.332544','2026-08-17 08:43:49.332544'),('fc0481d7-f666-4009-ac76-71b22e8a3e53','ccb15416-8d73-4cd3-a471-b489f5ac0340','b8441d449ef2c79f04b51a3c47b9d3e61be9387866d6f14ee624c49caf497bdb','f34ca4be-66c2-4972-a78e-b88af4df7125','2026-09-16 13:16:17.234538',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-17 13:16:17.234538','2026-08-17 13:16:17.234538'),('fd5f547c-0f30-4c8e-b77c-c39354853294','597f3a0a-d4bd-4041-b344-dc7815013c64','a384815ee87aabbfae5ba84d12d7da64d3c5e1c07379d90019eab27d769b9c8d','9387068d-b49a-4b91-afc7-2ac463372659','2026-09-17 05:10:27.130202',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 05:10:27.132347','2026-08-18 05:10:27.132347'),('fdd40665-c22d-4e57-acaf-6ad037267e7b','ccb15416-8d73-4cd3-a471-b489f5ac0340','1919e3f2e5b4a8e6cf08f11890314ddf7cb9c7d052830dd65f254370fbe4f20c','1c9c2779-845e-40a2-8b4a-39b19ec89fb4','2026-09-17 09:24:08.584091',NULL,'5391b65ba3a2515597e31f9ecae0dbda61211fb226098997773e580f9ab76851','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 09:24:08.585643','2026-08-18 09:39:14.856845');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reviewed_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reports_status` (`status`),
  KEY `idx_reports_entity` (`entity_type`,`entity_id`),
  KEY `idx_reports_reporter` (`reporter_id`),
  KEY `idx_reports_created_at` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OVERALL_EXPERIENCE',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `moderated_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `moderated_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reviews_user` (`user_id`),
  KEY `idx_reviews_status` (`status`),
  KEY `idx_reviews_status_created` (`status`,`created_at` DESC),
  KEY `idx_reviews_featured` (`status`,`is_featured`,`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RAZORPAY',
  `provider_customer_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_subscription_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_period_start` datetime(6) DEFAULT NULL,
  `current_period_end` datetime(6) DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscriptions_user` (`user_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_plan` (`plan_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_dependencies`
--

DROP TABLE IF EXISTS `task_dependencies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_dependencies` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `depends_on_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_dependency` (`task_id`,`depends_on_id`),
  KEY `idx_td_depends_on` (`depends_on_id`),
  KEY `idx_td_task` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_dependencies`
--

LOCK TABLES `task_dependencies` WRITE;
/*!40000 ALTER TABLE `task_dependencies` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_dependencies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `column_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `board_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `assignee_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `due_date` datetime(6) DEFAULT NULL,
  `labels` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `milestone` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sprint` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pull_request_number` bigint DEFAULT NULL,
  `pull_request_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pull_request_state` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime(6) DEFAULT NULL,
  `pr_created_at` datetime(6) DEFAULT NULL,
  `pr_merged_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_column_id` (`column_id`),
  KEY `idx_tasks_board_id` (`board_id`),
  KEY `idx_tasks_assignee_id` (`assignee_id`),
  KEY `idx_tasks_due_date` (`due_date`),
  KEY `idx_tasks_priority` (`priority`),
  KEY `idx_tasks_assignee` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES ('4415a71a-ed40-430c-9caf-115241e0fab4','Implement Login API',NULL,'458ea102-6ebe-4bdc-90fc-8e306904c708','dfcfee9b-0fcc-431e-9856-0bd9c43bf4f8',0,NULL,'MEDIUM',NULL,NULL,'2026-08-17 10:40:42.469878','2026-08-17 10:40:50.388415',NULL,NULL,'feature/implement-login-api-4415a71a',NULL,NULL,NULL,'2026-08-17 10:40:50.348419',NULL,NULL);
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_room_participants`
--

DROP TABLE IF EXISTS `team_room_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_room_participants` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invited_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_participant` (`room_id`,`user_id`),
  KEY `idx_trp_room_id` (`room_id`),
  KEY `idx_trp_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_room_participants`
--

LOCK TABLES `team_room_participants` WRITE;
/*!40000 ALTER TABLE `team_room_participants` DISABLE KEYS */;
INSERT INTO `team_room_participants` VALUES ('30e672ef-1e5c-446a-ae74-620d67ba1897','f6007f0c-75a2-4796-b94a-7e0fcb403dd2','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16',NULL,'2026-08-17 11:58:57.069353','2026-08-17 11:58:57.069353'),('5c15f912-ab07-4a81-95e4-2a4cb8dab119','0363eee2-aa8c-49c9-813c-f21f5445a3c3','7a470379-f044-4d2e-82b8-908c3a776f0b',NULL,'2026-08-17 09:32:42.544145','2026-08-17 09:32:42.544145'),('73a9449d-4bf7-4a23-92b1-e40a5cb2008c','b01cc43b-f527-4715-a5f3-3c8fc95ee510','7bb317ae-62fe-4d28-81c0-52198d817729',NULL,'2026-08-17 10:40:40.181487','2026-08-17 10:40:40.181487'),('7a547e7d-c276-406d-8f57-5caa894fea90','122ee582-969d-4244-b17d-979dc0098e42','00743207-61b1-4427-b9af-c1d6c6853468',NULL,'2026-08-17 08:43:42.436580','2026-08-17 08:43:42.436580'),('9c7e6e2d-dc7d-4cf5-b690-dd0936cc8dbf','f6007f0c-75a2-4796-b94a-7e0fcb403dd2','c476e4c6-c96d-458f-8d62-b26de6eaa1a3',NULL,'2026-08-17 12:04:14.457340','2026-08-17 12:04:14.457340'),('aae71ef3-f72d-4d91-a897-d565db4e7b25','0363eee2-aa8c-49c9-813c-f21f5445a3c3','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'2026-08-17 08:37:16.275211','2026-08-17 08:37:16.275211'),('bca25381-2c28-4cd2-a36b-c686a1fdcafe','8c27acd5-563e-4723-83e6-22af33502c03','708e3bd0-73d5-4f50-97e7-9cd096610467',NULL,'2026-08-17 08:37:16.275242','2026-08-17 08:37:16.275242'),('d247ea29-9a1e-11f1-a936-ecf4bb2b28b5','0363eee2-aa8c-49c9-813c-f21f5445a3c3','00743207-61b1-4427-b9af-c1d6c6853468',NULL,'2026-08-17 15:04:19.279894','2026-08-17 15:04:19.279894'),('d2480534-9a1e-11f1-a936-ecf4bb2b28b5','0363eee2-aa8c-49c9-813c-f21f5445a3c3','ccb15416-8d73-4cd3-a471-b489f5ac0340',NULL,'2026-08-17 15:04:19.279894','2026-08-17 15:04:19.279894');
/*!40000 ALTER TABLE `team_room_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_rooms`
--

DROP TABLE IF EXISTS `team_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_rooms` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_rooms_project` (`project_id`),
  KEY `idx_rooms_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_rooms`
--

LOCK TABLES `team_rooms` WRITE;
/*!40000 ALTER TABLE `team_rooms` DISABLE KEYS */;
INSERT INTO `team_rooms` VALUES ('0363eee2-aa8c-49c9-813c-f21f5445a3c3','skilll Chat','22fe8656-8d33-46fe-8175-51b06a966a72','708e3bd0-73d5-4f50-97e7-9cd096610467','Team chat for skilll','2026-08-17 08:37:16.266266','2026-08-17 08:37:16.266266'),('122ee582-969d-4244-b17d-979dc0098e42','Skill Swapper Chat','0fd4e3a3-31b2-4aa8-b954-3fe47ab5ee59','00743207-61b1-4427-b9af-c1d6c6853468','Team chat for Skill Swapper','2026-08-17 08:43:42.435577','2026-08-17 08:43:42.435577'),('b01cc43b-f527-4715-a5f3-3c8fc95ee510','Login Flow — Team Chat','69216961-aad7-423c-9a11-6b5ffcea293c','7bb317ae-62fe-4d28-81c0-52198d817729','Team chat for Login Flow','2026-08-17 10:40:40.173486','2026-08-17 10:40:40.173486'),('f6007f0c-75a2-4796-b94a-7e0fcb403dd2','Ownership Smoke — Team Chat','6230c9aa-d9d9-415b-a2c3-30cddb2efb7a','1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','Team chat for Ownership Smoke','2026-08-17 11:58:57.058350','2026-08-17 11:58:57.058350');
/*!40000 ALTER TABLE `team_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `follower_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `following_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_follow` (`follower_id`,`following_id`),
  KEY `idx_uf_follower` (`follower_id`),
  KEY `idx_uf_following` (`following_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
INSERT INTO `user_follows` VALUES ('09a6d3b7-30f5-46fd-8502-08686b39ab75','bdd16b9c-7b44-48f9-b584-d83855e6fc6b','708e3bd0-73d5-4f50-97e7-9cd096610467','2026-08-18 08:32:16.352360','2026-08-18 08:32:16.352360');
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twitter_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `auth_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'email',
  `last_login_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `blocked` tinyint(1) NOT NULL DEFAULT '0',
  `deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `last_active_at` datetime(6) DEFAULT NULL,
  `presence_status` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFLINE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_username` (`username`),
  KEY `idx_users_role_deleted_blocked` (`role`,`deleted`,`blocked`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_last_login_at` (`last_login_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('00743207-61b1-4427-b9af-c1d6c6853468','chat_owner@test.dev','$2a$10$dyVXu78zG1QL6PZRWnA9wuHSCuTzRaUcsvoM.hbZxhzp2poo4zxRq','Chat Owner','chatowner',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 08:48:01.549825','2026-08-17 08:43:36.113992','2026-08-17 09:39:11.172215',0,0,NULL,'2026-08-17 09:39:11.172215','OFFLINE'),('1070f041-9a7d-4d0f-be74-0dcb3e6d9e16','owner1786967852@dev.com','$2a$10$OofWanrq3bg/zhWRTZBXAuR.E5a9EQ88V6Gb2Zn.PXNp/vYxtpB5m','Owner Smoke','ownersmoke1786967852',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 12:03:49.935776','2026-08-17 11:57:33.930323','2026-08-17 12:31:01.113982',0,0,NULL,'2026-08-17 12:31:01.112980','OFFLINE'),('1251cd8b-c490-4926-be00-431a093b4fa4','ratetestb@test.com','$2a$10$MF455frfw9R1QzlJTzQv..Xuup9OmIHrd8VlQARWK6gpXcwG7h80G','Rate Test B','ratetestb',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 09:09:59.400149','2026-08-18 09:09:59.400149',0,0,NULL,NULL,'OFFLINE'),('16c70b4d-a151-4a3e-b987-b3a078f17316','preview.tester4@example.com','$2a$10$25zM3N5a.d8mpYLcan.2se8L0wCwDuJom7mNchfaQ5gOsZNlfBl7m','Preview Tester','previewtester4',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:12:28.212516','2026-08-18 06:12:33.417639',0,0,NULL,'2026-08-18 06:12:33.417639','OFFLINE'),('2bc541bd-0041-446d-bbe2-612c5222b16f','ratetesta@test.com','$2a$10$VVU6bfTzthNB2kQ.s3Stl.wH.cT7oWyPiB/aTD8OlaM.MB0FLm2Aq','Rate Test A','ratetesta',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 09:09:54.757735','2026-08-18 09:09:54.757735',0,0,NULL,NULL,'OFFLINE'),('48356923-3da4-46e0-8135-3b2d1fc983cf','attacker1787034833@test.com','$2a$10$C66wxjI2d9q51BOjLO5mse16aXwk0q9epWXkRT3CVAefadJkET/4m','Attacker','attacker1787034833',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 06:33:53.431993','2026-08-18 06:33:53.431993',0,0,NULL,NULL,'OFFLINE'),('597f3a0a-d4bd-4041-b344-dc7815013c64','preview.tester2@example.com','$2a$10$4IsGUVcNQhgsR1PeTfmNsO7Yd8/E3rX6lt3AGUl9mgJuFfTTIWjc.','Preview Tester','previewtester2',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:10:26.823969','2026-08-18 05:10:26.823969',0,0,NULL,NULL,'OFFLINE'),('708e3bd0-73d5-4f50-97e7-9cd096610467','tushardhiman@gmail.com','$2a$10$CmFg0EubSe3L/teq0JdwKeBwweVftd/ClNZaaHXSRmBCw1qUvhXnS','Tushar Dhiman','tushar97',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'ADMIN',0,'email','2026-08-18 12:21:38.168214','2026-08-17 06:22:05.690251','2026-08-18 12:27:30.101143',0,0,NULL,'2026-08-18 12:27:30.100145','OFFLINE'),('7a3e7b7d-a022-4781-8b07-8b8642b15571','feedflow1787031578@test.com','$2a$10$G4id0LIyADEZYBfcegdsEOlbmRDnKJFfyO.FeXmzZy2Df.bxruSjm','Flow Test','feedflow1787031578',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-18 06:04:16.991680','2026-08-18 05:39:38.758696','2026-08-18 06:04:16.991680',0,0,NULL,NULL,'OFFLINE'),('7a470379-f044-4d2e-82b8-908c3a776f0b','chatfix@test.dev','$2a$10$0q8GhWFOk7hFrtt09UmN3OTvWN0b7AHdwquj6BsRQJRJzAmBmbIde','Chat Fix','chatfix',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 09:32:52.324226','2026-08-17 09:32:32.805851','2026-08-17 09:32:52.329223',0,0,NULL,NULL,'OFFLINE'),('7bb317ae-62fe-4d28-81c0-52198d817729','flow_owner@test.dev','$2a$10$GSwv1AwOSRVBvGTZdwl34uH8FQFoDq62LVZsNi55etIqtEzduXxpq','Flow Owner','flowowner',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 10:48:13.153474','2026-08-17 10:40:32.109942','2026-08-17 11:04:12.641880',0,0,NULL,'2026-08-17 11:04:12.640881','OFFLINE'),('96279d89-e856-4534-b299-34505a852e2e','preview.tester3@example.com','$2a$10$R1y5DxP2v69FArWHMesrMedd0WM5We09dxUoiqGgrsm6Vq/dERFz6','Preview Tester','previewtester3',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:11:39.875309','2026-08-18 05:11:39.875309',0,0,NULL,NULL,'OFFLINE'),('98a24954-6ad4-42c7-8ae2-46ae2b6229d6','feedtest21787031573@test.com','$2a$10$Gk3gFhML62d/uzsf/Yu2K.V.oH8xfOHokgKyFYfmxt3ZGFROVsnwS','Feed Test','feedtest21787031573',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:39:33.784514','2026-08-18 05:39:33.784514',0,0,NULL,NULL,'OFFLINE'),('b7eaa586-6450-4e65-8f3f-2d7f92fd7e2f','ratetestc@test.com','$2a$10$iNL1/A2v3RF8QI7g0AtDhe4nrVrkU1UUIIXF1i/ifyF/2vBG7qyFe','Rate Test C','ratetestc',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 09:10:08.347283','2026-08-18 09:10:08.347283',0,0,NULL,NULL,'OFFLINE'),('bd2da8cf-9aff-11f1-a936-ecf4bb2b28b5','nakulsharma@gmail.com','$2a$10$3wXhMDNi3/c5i0xZy96k5O2Xf7V0fYs2nY3QXWpmOFJOQIZrkrmEW','Nakul Sharma','nakulsharma',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'ADMIN',1,'email','2026-08-18 13:01:13.636312','2026-08-18 17:54:20.000000','2026-08-18 13:01:50.026969',0,0,NULL,'2026-08-18 13:01:50.024763','ONLINE'),('bdd16b9c-7b44-48f9-b584-d83855e6fc6b','feedtester01@example.com','$2a$10$060ZXPdx7l7QsjJkkwf70.e5rFxbpe4v0IuzRFWnkUZStfUV/IlIO','Feed Tester','feedtester01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-18 06:34:07.103652','2026-08-18 06:31:51.546444','2026-08-18 08:33:24.813208',0,0,NULL,'2026-08-18 08:33:24.812107','OFFLINE'),('c476e4c6-c96d-458f-8d62-b26de6eaa1a3','member1786967852@dev.com','$2a$10$laiaqpvDHGHT/F86OIUNs.UYjuoMTyFJnSoBzmaN2XAWsh9yD6H9.','Member Smoke','membersmoke1786967852',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 11:58:46.953702','2026-08-17 11:57:37.547581','2026-08-17 11:58:46.956704',0,0,NULL,NULL,'OFFLINE'),('c95f5b5c-fa9e-46bf-9d3a-1a8c2530ff36','modal1786947963@devsync.test','$2a$10$S5Qgx6vlEQDHGEnsY/BYpu83hIKhMeSwCpfA0CKcDp4hZYyHH1XY2','Modal Tester','modal1786947963',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-17 06:26:51.563725','2026-08-17 06:26:04.158717','2026-08-17 06:41:51.044814',0,0,NULL,'2026-08-17 06:41:51.043813','OFFLINE'),('ccb15416-8d73-4cd3-a471-b489f5ac0340','nakulsharma978397@gmail.com','$2a$10$zcGxf7NiGMAlcYSXL52rteTxuikzWhX9eEB1Qk5EfMqCjz0zaoXZ6','Nakul Sharma','nakul97',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-18 12:11:28.124943','2026-08-17 06:22:25.043042','2026-08-18 12:11:32.863355',0,0,NULL,'2026-08-18 12:11:32.860359','ONLINE'),('cdee0700-8674-4ece-9449-fde685ab514b','feedtest1787031569@test.com','$2a$10$lB0E6uXr5ikuAgWtBOaF8eM7TK0P8rjMDsltFSDYKDkR6xoURCMoS','Feed Test','feedtest1787031569',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:39:29.561941','2026-08-18 05:39:29.561941',0,0,NULL,NULL,'OFFLINE'),('cf8ffbc3-5684-4576-aa77-43823cab76c8','viewer1787031886@test.com','$2a$10$32byCrYp4TaLc8vbmxqwm.b4H7paR/.LeRATJw112f9l30amSclG6','Viewer','viewer1787031886',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email',NULL,'2026-08-18 05:44:46.861792','2026-08-18 05:44:46.861792',0,0,NULL,NULL,'OFFLINE'),('d5d987ef-bbb4-4f8a-a2ce-44e3f61d8aef','social-a@test.dev','$2a$10$7CFrjzJuO5wSnD9KUV6WtuAWiSRJUTFoMWY70JpWJ3CpgA5/xhDHO','Social User A','sociala',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-18 08:34:15.778861','2026-08-18 08:21:43.191892','2026-08-18 08:49:22.684381',0,0,NULL,'2026-08-18 08:49:22.684381','OFFLINE'),('d90d0932-2dec-4164-97b9-429e77a2a7a0','social-b@test.dev','$2a$10$133MeOfsyIKIcHR08YxSHOaspVpWTPX2A0avvy9d2EHj/AW5IaLdq','Social User B','socialb',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'USER',0,'email','2026-08-18 08:21:55.703286','2026-08-18 08:21:43.792221','2026-08-18 08:21:55.705289',0,0,NULL,NULL,'OFFLINE');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhook_events`
--

DROP TABLE IF EXISTS `webhook_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhook_events` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_event_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` mediumtext COLLATE utf8mb4_unicode_ci,
  `processed` tinyint(1) NOT NULL DEFAULT '0',
  `processed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_provider_event` (`provider`,`provider_event_id`),
  KEY `idx_webhook_processed` (`processed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhook_events`
--

LOCK TABLES `webhook_events` WRITE;
/*!40000 ALTER TABLE `webhook_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhook_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'dev'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-18 18:35:29
