import type { NotificationPort } from '../domain/ports';
import type { Notification } from '../domain/types';

export class InAppNotifier implements NotificationPort {
  private notifications: Notification[] = [];

  notify(notification: Notification): void {
    this.notifications.push(notification);
  }

  list(): Notification[] {
    return [...this.notifications];
  }
}
