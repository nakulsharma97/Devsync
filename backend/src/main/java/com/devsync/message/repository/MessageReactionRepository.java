package com.devsync.message.repository;

import com.devsync.message.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, String> {

    Optional<MessageReaction> findByMessageIdAndUserIdAndEmoji(String messageId, String userId, String emoji);

    List<MessageReaction> findByMessageIdIn(Collection<String> messageIds);

    long countByMessageId(String messageId);
}
