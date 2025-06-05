import { TaskStatus } from '../../../generated/prisma';

export class TaskStateTransitions {
  // Define valid state transitions as a map
  private static readonly VALID_TRANSITIONS: Map<TaskStatus, TaskStatus[]> =
    new Map([
      [TaskStatus.BACKLOG, [TaskStatus.TODO, TaskStatus.IN_PROGRESS]],
      [
        TaskStatus.TODO,
        [TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, TaskStatus.DONE],
      ],
      [
        TaskStatus.IN_PROGRESS,
        [TaskStatus.TODO, TaskStatus.REVIEW, TaskStatus.DONE],
      ],
      [
        TaskStatus.REVIEW,
        [TaskStatus.IN_PROGRESS, TaskStatus.TODO, TaskStatus.DONE],
      ],
      [
        TaskStatus.DONE,
        [TaskStatus.REVIEW, TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      ],
    ]);

  /**
   * Validates if a transition from one status to another is allowed
   * @param currentStatus Current task status
   * @param newStatus Desired new task status
   * @returns true if transition is valid, false otherwise
   */
  static isValidTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): boolean {
    // Same status is always allowed (no change)
    if (currentStatus === newStatus) {
      return true;
    }

    const allowedTransitions = this.VALID_TRANSITIONS.get(currentStatus);
    return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
  }

  /**
   * Gets all valid transitions from a given status
   * @param currentStatus Current task status
   * @returns Array of valid next statuses
   */
  static getValidTransitions(currentStatus: TaskStatus): TaskStatus[] {
    return this.VALID_TRANSITIONS.get(currentStatus) || [];
  }

  /**
   * Gets a human-readable error message for invalid transitions
   * @param currentStatus Current task statusÖ
   * @param newStatus Desired new task status
   * @returns Error message explaining why the transition is invalid
   */
  static getTransitionErrorMessage(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): string {
    const validTransitions = this.getValidTransitions(currentStatus);
    return `Invalid status transition from ${currentStatus} to ${newStatus}. Valid transitions from ${currentStatus} are: ${validTransitions.join(', ')}`;
  }
}
