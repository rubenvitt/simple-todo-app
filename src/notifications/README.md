# Notification System

Das Notification-System bietet eine vollständige Lösung für die Verwaltung von Benutzerbenachrichtigungen in der Todo-App.

## Komponenten

### NotificationsService
Hauptservice für CRUD-Operationen mit Notifications:
- `create()` - Erstellt neue Notifications
- `findAll()` - Ruft Notifications mit Pagination und Filtering ab
- `findOne()` - Ruft eine spezifische Notification ab
- `update()` - Aktualisiert eine Notification
- `markAsRead()` / `markAsUnread()` - Ändert den Lesestatus
- `markAllAsRead()` - Markiert alle Notifications als gelesen
- `remove()` - Löscht eine Notification
- `cleanupOldNotifications()` - Bereinigt alte Notifications

### NotificationEventService
Event-driven Service für automatische Notification-Erstellung:
- `createTaskAssignmentNotification()` - Task-Zuweisungen
- `createTaskStatusChangeNotification()` - Task-Status-Änderungen
- `createListSharedNotification()` - List-Sharing
- `createInvitationReceivedNotification()` - Einladungen erhalten
- `createInvitationAcceptedNotification()` - Einladungen akzeptiert
- `createListUpdateNotification()` - List-Updates

### NotificationsController
REST API Endpoints:
- `GET /notifications` - Paginierte Liste mit Filtering
- `GET /notifications/:id` - Spezifische Notification
- `POST /notifications` - Neue Notification erstellen
- `PATCH /notifications/:id` - Notification aktualisieren
- `PATCH /notifications/:id/read` - Als gelesen markieren
- `PATCH /notifications/:id/unread` - Als ungelesen markieren
- `PATCH /notifications/mark-all-read` - Alle als gelesen markieren
- `DELETE /notifications/:id` - Notification löschen

## Verwendung in anderen Services

### Task Assignment Notification
```typescript
import { NotificationEventService } from '../notifications/notification-event.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly notificationEventService: NotificationEventService,
    // ... andere dependencies
  ) {}

  async assignTask(taskId: string, assignedUserId: string, assignerUserId: string) {
    // Task assignment logic...
    
    // Notification erstellen
    await this.notificationEventService.createTaskAssignmentNotification({
      assignedUserId,
      taskTitle: task.title,
      listName: task.list.name,
      assignerName: assigner.name,
    });
  }
}
```

### Task Status Change Notification
```typescript
async updateTaskStatus(taskId: string, newStatus: TaskStatus, userId: string) {
  const task = await this.findTaskWithDetails(taskId);
  
  // Status update logic...
  
  // Notification für Task-Owner oder Assignee
  if (task.assignedUserId && task.assignedUserId !== userId) {
    await this.notificationEventService.createTaskStatusChangeNotification({
      userId: task.assignedUserId,
      taskTitle: task.title,
      oldStatus: task.status,
      newStatus,
      listName: task.list.name,
    });
  }
}
```

### List Sharing Notification
```typescript
async shareList(listId: string, userId: string, permissionLevel: PermissionLevel, ownerId: string) {
  // List sharing logic...
  
  await this.notificationEventService.createListSharedNotification({
    sharedWithUserId: userId,
    listName: list.name,
    ownerName: owner.name,
    permissionLevel,
  });
}
```

## Notification Types

- `GENERAL` - Allgemeine Benachrichtigungen
- `TASK_ASSIGNMENT` - Task wurde zugewiesen
- `TASK_STATUS_CHANGE` - Task-Status wurde geändert
- `LIST_SHARED` - Liste wurde geteilt
- `INVITATION_RECEIVED` - Einladung erhalten
- `INVITATION_ACCEPTED` - Einladung akzeptiert
- `LIST_UPDATE` - Liste wurde aktualisiert

## API Beispiele

### Notifications abrufen
```bash
GET /notifications?page=1&limit=20&read=false&type=TASK_ASSIGNMENT
```

### Notification als gelesen markieren
```bash
PATCH /notifications/123/read
```

### Alle Notifications als gelesen markieren
```bash
PATCH /notifications/mark-all-read
```

## Error Handling

Der NotificationEventService behandelt Fehler graceful - wenn eine Notification nicht erstellt werden kann, wird der Hauptvorgang nicht unterbrochen. Fehler werden in der Konsole geloggt.

## Testing

Umfangreiche Tests sind verfügbar:
- `notifications.service.spec.ts` - 20 Tests für NotificationsService
- `notifications.controller.spec.ts` - 14 Tests für NotificationsController  
- `notification-event.service.spec.ts` - 14 Tests für NotificationEventService

Gesamt: 48 Tests mit vollständiger Abdeckung aller Funktionen. 