package com.devsync.kanban.entity;

import com.devsync.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "board_columns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardColumn extends BaseEntity {

    @Column(name = "board_id", nullable = false)
    private String boardId;

    @Column(nullable = false)
    private String name;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "color")
    private String color;

    @Column(name = "max_tasks")
    private Integer maxTasks;
}
