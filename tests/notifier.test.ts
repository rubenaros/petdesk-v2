import { InAppNotifier } from '../src/infra/inAppNotifier';
import { notificationPortContract } from './contracts/NotificationPort.contract';

notificationPortContract(() => new InAppNotifier());
