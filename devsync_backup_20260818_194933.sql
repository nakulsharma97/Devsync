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
INSERT INTO `audit_logs` VALUES ('15b9ec8e-d31d-4e12-9763-31b7b93cd69d','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:23:06.182692','2026-08-18 13:23:06.182692'),('1c40071c-4e83-4f3f-896e-71d50900ce4b','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:38:08.859291','2026-08-18 13:38:08.859291'),('250a5ab2-e499-40b0-9038-50fbe2267585','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:07:12.395131','2026-08-18 13:07:12.395131'),('28e81a0e-5843-4967-b6ce-2db35201e670','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:07:22.787841','2026-08-18 13:07:22.787841'),('4088083f-2a24-4184-97c2-96ecf0c23bf5',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 13:55:02.231363','2026-08-18 13:55:02.231363'),('48bd5d6b-01e0-4885-a0e7-cc05c5726eda',NULL,NULL,'LOGOUT','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','User logged out','2026-08-18 13:45:02.951294','2026-08-18 13:45:02.951294'),('506b5056-15f5-422c-aebb-f61b478615da','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Unknown','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:07:22.375174','2026-08-18 13:07:22.375174'),('5d6e62ca-d45d-4fb9-b4e4-1e955ab2e33d','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:22:59.405864','2026-08-18 13:22:59.405864'),('69793b2b-a641-4e13-8584-4e0f801985d4',NULL,NULL,'LOGOUT','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','User logged out','2026-08-18 14:04:05.893066','2026-08-18 14:04:05.893066'),('75dacd55-e578-4185-8857-721d4295f036','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:38:08.852294','2026-08-18 13:38:08.852294'),('8086b9ce-cd3b-4960-ac9d-775bd977f449','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 14:16:37.750421','2026-08-18 14:16:37.750421'),('80e5a7d9-bd88-40ce-8b55-f8f8321fc2bb',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Invalid or expired refresh token','2026-08-18 13:21:41.405342','2026-08-18 13:21:41.405342'),('9c285a67-0bc1-425b-846d-24af70624c50','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:51:49.018952','2026-08-18 13:51:49.018952'),('aa45ba77-0490-4f8b-a6be-ac3c310c27a9','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakul@gmail.com','2026-08-18 13:21:50.857881','2026-08-18 13:21:50.857881'),('ab8650f6-768c-4f18-ab72-bd355a389a4f',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 13:55:02.200112','2026-08-18 13:55:02.200112'),('af45062c-eb66-4314-846c-543a6c06132d','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:23:06.189689','2026-08-18 13:23:06.189689'),('af7dea06-4c2f-47bc-ad70-1adf071521e0','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:39:07.125158','2026-08-18 13:39:07.125158'),('cd179d77-804e-440f-968d-43f3ce8f052a','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:55:02.085634','2026-08-18 13:55:02.085634'),('cff0cc9a-6320-4b1d-b33a-2d0f958f7dbd',NULL,NULL,'JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Refresh token rejected: Refresh token reuse detected — session revoked','2026-08-18 13:55:02.184488','2026-08-18 13:55:02.184488'),('d0d89f16-dd7f-4ef4-aa53-8e81e7e2cd56',NULL,NULL,'LOGIN_FAILURE','0:0:0:0:0:0:0:1','Desktop','Chrome','FAILURE','Failed login attempt for nakulsharma978397@gmail.com: Invalid email or password','2026-08-18 13:21:41.362298','2026-08-18 13:21:41.362298'),('dd4ac1db-0e2b-4342-8939-180a3b16edab','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','LOGIN_SUCCESS','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Login successful for nakull','2026-08-18 13:07:32.257304','2026-08-18 13:07:32.257304'),('f39e0f50-2ab6-468e-8b16-4d9bae80c50d','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a1813165-9b05-11f1-a936-ecf4bb2b28b5','JWT_REFRESH','0:0:0:0:0:0:0:1','Desktop','Chrome','SUCCESS','Token refreshed for nakul@gmail.com','2026-08-18 13:39:07.116159','2026-08-18 13:39:07.116159');
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
INSERT INTO `refresh_tokens` VALUES ('0ba75654-d9a6-4abe-982f-6f31269e515f','a1813165-9b05-11f1-a936-ecf4bb2b28b5','df5b5fb5f865243ab1123536715a7ee71ff3d8275760f0630656d00cacb103d8','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:07:32.236306',NULL,'6e28fcec23b0bc9048d9c260cb4e05afe369dbf9827a4ec6b93ad9e78ad92e63','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:07:32.236306','2026-08-18 13:23:06.165686'),('34f0fe7b-0663-40e0-81ec-fe36cb7d4c8c','a1813165-9b05-11f1-a936-ecf4bb2b28b5','52c9e03553fb5221ca960ba66215fc78e1164f2791a4c16be8b9932b52c114e3','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:55:02.013159',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:55:02.013159','2026-08-18 13:55:02.013159'),('4161ba51-eccb-46b0-8aa0-34e59f8dff86','a1813165-9b05-11f1-a936-ecf4bb2b28b5','54cfd9d1079e967e342582314f51f999c9b0973e1114b6e94d89e5a24a9ddcda','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:39:07.077161',NULL,'52c9e03553fb5221ca960ba66215fc78e1164f2791a4c16be8b9932b52c114e3','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:39:07.078156','2026-08-18 13:55:02.013159'),('55b6282e-59cf-4b39-b93d-0db46c1a0dfc','a1813165-9b05-11f1-a936-ecf4bb2b28b5','44ca91d554d6fa8203cad23eeb2071d9d71dc9c64e9880fbff1187f13e7207ff','bfd1a2b1-f0f3-496a-9662-53d3c82b5a49','2026-09-17 13:51:48.982926','2026-08-18 14:04:05.892063',NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:51:48.982926','2026-08-18 14:04:05.893066'),('56e577e0-84d7-44af-bf7f-dc7cccd8cad3','a1813165-9b05-11f1-a936-ecf4bb2b28b5','5745a932565b44de958f45a419c833b70b387283469905fab859298132371e54','22e37131-a6e1-4656-8456-a39a3754fbc1','2026-09-17 13:38:08.827294',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:38:08.827294','2026-08-18 13:38:08.827294'),('609c4bbc-1834-4ae8-8b77-1e289dd5d84c','a1813165-9b05-11f1-a936-ecf4bb2b28b5','0ea5282dd400e3af45fef21da843b51beb4a96578ab0e6d3ff2adb2b4a03f4ce','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:23:06.159688',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:23:06.160690','2026-08-18 13:23:06.160690'),('73891cae-76ed-4193-9b5d-931d6748ef2b','a1813165-9b05-11f1-a936-ecf4bb2b28b5','5a10b7a5614177b2a5d8ec45c08bc360e1328cd2f5aed705d3f76cdbd820ed46','22e37131-a6e1-4656-8456-a39a3754fbc1','2026-09-17 13:38:08.826290','2026-08-18 13:45:02.951294',NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:38:08.827294','2026-08-18 13:45:02.951294'),('74798492-50f3-4def-a052-2280b89b7b64','a1813165-9b05-11f1-a936-ecf4bb2b28b5','59c1565934b517bf9c8e16f2a1bdb82190f0758ddac50c40de3cf62d98323b50','ae20013e-aebd-41a6-b870-a09651d06378','2026-09-17 14:16:37.728463',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 14:16:37.728463','2026-08-18 14:16:37.728463'),('75c28995-bce7-44e2-81e4-fa133d4bc18e','a1813165-9b05-11f1-a936-ecf4bb2b28b5','d23c5d2fe717686e3c72eb1c06b0d9dc2267fef58d620d2fda4df70c085200c8','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:39:07.072158',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:39:07.074159','2026-08-18 13:39:07.074159'),('7b747d57-f171-45b4-82bf-3c3392f71a28','a1813165-9b05-11f1-a936-ecf4bb2b28b5','6e28fcec23b0bc9048d9c260cb4e05afe369dbf9827a4ec6b93ad9e78ad92e63','531f60f1-b568-4793-85b6-0f6c22492c86','2026-09-17 13:23:06.163688',NULL,'54cfd9d1079e967e342582314f51f999c9b0973e1114b6e94d89e5a24a9ddcda','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:23:06.164688','2026-08-18 13:39:07.079159'),('8d36068d-03dc-4a09-bd31-f8d9ae7730e4','a1813165-9b05-11f1-a936-ecf4bb2b28b5','a5b64b654d5db55e30d129e59496afd047e5653de160f682d86e4e1e82c3f615','298794bd-403c-4dfc-861d-81d90eb83e16','2026-09-17 13:07:22.700880',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 13:07:22.701881','2026-08-18 13:07:22.701881'),('a034a72a-417f-4f64-9f73-62d71300b84b','a1813165-9b05-11f1-a936-ecf4bb2b28b5','1b95455b737823dd99c9b5e485ad268a3c89b3fd6d7ab46fad25b62e249257ae','7a573d8b-9c42-4841-b251-85f22ad6f474','2026-09-17 13:07:12.375344',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 13:07:12.376343','2026-08-18 13:07:12.376343'),('d6b483cf-e27d-43e6-8af7-b2c696f0449a','a1813165-9b05-11f1-a936-ecf4bb2b28b5','960471f9e6356f6e9b1e1955d08727e2dd73b7d0540a1a4f783829d779b68335','a4e46488-4bd8-4488-8e32-7675d1b776cc','2026-09-17 13:07:22.356182',NULL,NULL,'0:0:0:0:0:0:0:1','curl/8.19.0','2026-08-18 13:07:22.357176','2026-08-18 13:07:22.357176'),('eaf755b0-1e4d-4d20-aa3a-e593c39658fb','a1813165-9b05-11f1-a936-ecf4bb2b28b5','89dca594ecae00436aaf629f263346c03a04a85382bceb5ab3dee835e19e4afe','15fccf78-d03a-4364-8d4e-d11474499d21','2026-09-17 13:21:50.822524',NULL,NULL,'0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:21:50.823532','2026-08-18 13:21:50.823532'),('f2bd4483-4743-44f2-99c4-a843d95482cb','a1813165-9b05-11f1-a936-ecf4bb2b28b5','df660f7df714767b51c1b38b97a19aa5ae5014ae4b61c350f5598a3a825c8a74','22e37131-a6e1-4656-8456-a39a3754fbc1','2026-09-17 13:22:59.388584',NULL,'5a10b7a5614177b2a5d8ec45c08bc360e1328cd2f5aed705d3f76cdbd820ed46','0:0:0:0:0:0:0:1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','2026-08-18 13:22:59.388584','2026-08-18 13:38:08.828292');
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
INSERT INTO `users` VALUES ('a1813165-9b05-11f1-a936-ecf4bb2b28b5','nakul@gmail.com','$2a$10$M4OFlaOGgYr3PpQZiM7p/.LKhVAGvGCCcZxEVuAhwnHqmTq.SF3ve','Nakul','nakull',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'ADMIN',1,'email','2026-08-18 14:16:37.706309','2026-08-18 18:36:31.000000','2026-08-18 14:16:39.310977',0,0,NULL,'2026-08-18 14:16:39.309970','ONLINE');
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

-- Dump completed on 2026-08-18 19:49:34
