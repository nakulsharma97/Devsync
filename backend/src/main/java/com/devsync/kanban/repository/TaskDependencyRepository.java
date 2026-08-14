package com.devsync.kanban.repository;

import com.devsync.kanban.entity.TaskDependency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TaskDependencyRepository extends JpaRepository<TaskDependency, String> {

    Optional<TaskDependency> findByTaskIdAndDependsOnId(String taskId, String dependsOnId);

    List<TaskDependency> findByTaskId(String taskId);

    List<TaskDependency> findByTaskIdIn(Collection<String> taskIds);

    List<TaskDependency> findByDependsOnId(String dependsOnId);

    boolean existsByTaskIdAndDependsOnId(String taskId, String dependsOnId);
}
