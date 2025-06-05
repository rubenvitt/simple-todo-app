import { TaskStatus } from '../../../generated/prisma';
import { TaskStateTransitions } from './task-state-transitions';

describe('TaskStateTransitions', () => {
  describe('isValidTransition', () => {
    it('should allow transitions from BACKLOG to TODO and IN_PROGRESS', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.BACKLOG,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.BACKLOG,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
    });

    it('should not allow invalid transitions from BACKLOG', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.BACKLOG,
          TaskStatus.REVIEW,
        ),
      ).toBe(false);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.BACKLOG,
          TaskStatus.DONE,
        ),
      ).toBe(false);
    });

    it('should allow transitions from TODO to BACKLOG, IN_PROGRESS, and DONE', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.TODO,
          TaskStatus.BACKLOG,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.TODO,
          TaskStatus.DONE,
        ),
      ).toBe(true);
    });

    it('should not allow invalid transitions from TODO', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.TODO,
          TaskStatus.REVIEW,
        ),
      ).toBe(false);
    });

    it('should allow transitions from IN_PROGRESS to TODO, REVIEW, and DONE', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.REVIEW,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.DONE,
        ),
      ).toBe(true);
    });

    it('should not allow invalid transitions from IN_PROGRESS', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.BACKLOG,
        ),
      ).toBe(false);
    });

    it('should allow transitions from REVIEW to IN_PROGRESS, TODO, and DONE', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.REVIEW,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.REVIEW,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.REVIEW,
          TaskStatus.DONE,
        ),
      ).toBe(true);
    });

    it('should not allow invalid transitions from REVIEW', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.REVIEW,
          TaskStatus.BACKLOG,
        ),
      ).toBe(false);
    });

    it('should allow transitions from DONE to REVIEW, TODO, and IN_PROGRESS', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.DONE,
          TaskStatus.REVIEW,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.DONE,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.DONE,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
    });

    it('should not allow invalid transitions from DONE', () => {
      expect(
        TaskStateTransitions.isValidTransition(
          TaskStatus.DONE,
          TaskStatus.BACKLOG,
        ),
      ).toBe(false);
    });

    it('should always allow staying in the same status', () => {
      const allStatuses = Object.values(TaskStatus);

      allStatuses.forEach((status) => {
        expect(TaskStateTransitions.isValidTransition(status, status)).toBe(
          true,
        );
      });
    });
  });

  describe('getValidTransitions', () => {
    it('should return correct valid transitions for BACKLOG', () => {
      const validTransitions = TaskStateTransitions.getValidTransitions(
        TaskStatus.BACKLOG,
      );
      expect(validTransitions).toEqual([
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
      ]);
    });

    it('should return correct valid transitions for TODO', () => {
      const validTransitions = TaskStateTransitions.getValidTransitions(
        TaskStatus.TODO,
      );
      expect(validTransitions).toEqual([
        TaskStatus.BACKLOG,
        TaskStatus.IN_PROGRESS,
        TaskStatus.DONE,
      ]);
    });

    it('should return correct valid transitions for IN_PROGRESS', () => {
      const validTransitions = TaskStateTransitions.getValidTransitions(
        TaskStatus.IN_PROGRESS,
      );
      expect(validTransitions).toEqual([
        TaskStatus.TODO,
        TaskStatus.REVIEW,
        TaskStatus.DONE,
      ]);
    });

    it('should return correct valid transitions for REVIEW', () => {
      const validTransitions = TaskStateTransitions.getValidTransitions(
        TaskStatus.REVIEW,
      );
      expect(validTransitions).toEqual([
        TaskStatus.IN_PROGRESS,
        TaskStatus.TODO,
        TaskStatus.DONE,
      ]);
    });

    it('should return correct valid transitions for DONE', () => {
      const validTransitions = TaskStateTransitions.getValidTransitions(
        TaskStatus.DONE,
      );
      expect(validTransitions).toEqual([
        TaskStatus.REVIEW,
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
      ]);
    });
  });

  describe('getTransitionErrorMessage', () => {
    it('should return correct error message for invalid transition', () => {
      const errorMessage = TaskStateTransitions.getTransitionErrorMessage(
        TaskStatus.BACKLOG,
        TaskStatus.REVIEW,
      );

      expect(errorMessage).toBe(
        'Invalid status transition from BACKLOG to REVIEW. Valid transitions from BACKLOG are: TODO, IN_PROGRESS',
      );
    });

    it('should return correct error message for different invalid transition', () => {
      const errorMessage = TaskStateTransitions.getTransitionErrorMessage(
        TaskStatus.TODO,
        TaskStatus.REVIEW,
      );

      expect(errorMessage).toBe(
        'Invalid status transition from TODO to REVIEW. Valid transitions from TODO are: BACKLOG, IN_PROGRESS, DONE',
      );
    });

    it('should handle edge cases gracefully', () => {
      const errorMessage = TaskStateTransitions.getTransitionErrorMessage(
        TaskStatus.DONE,
        TaskStatus.BACKLOG,
      );

      expect(errorMessage).toBe(
        'Invalid status transition from DONE to BACKLOG. Valid transitions from DONE are: REVIEW, TODO, IN_PROGRESS',
      );
    });
  });
});
