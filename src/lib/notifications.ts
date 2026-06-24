export const configureNotificationChannel = async () => {};
export async function requestUserPermission() { return false; }
export async function getFCMToken() { return null; }
export async function savePushTokenToUser(userId: string) {}
export async function onBackgroundMessage(remoteMessage: any) {}

export async function sendPushNotification(payload: any) { return null; }
export async function sendPushNotificationToAll(title: string, body: string, data?: Record<string, any>) { return null; }
export async function sendPushNotificationToCourse(courseId: string, title: string, body: string, data?: Record<string, any>) { return null; }
export async function sendPushNotificationToUser(userId: string, title: string, body: string, data?: Record<string, any>) { return null; }
