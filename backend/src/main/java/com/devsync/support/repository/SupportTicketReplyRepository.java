package com.devsync.support.repository;

import com.devsync.support.entity.SupportTicketReply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketReplyRepository extends JpaRepository<SupportTicketReply, String> {

    List<SupportTicketReply> findByTicketIdOrderByCreatedAtAsc(String ticketId);

    long countByTicketIdAndAdminReplyTrue(String ticketId);
}
