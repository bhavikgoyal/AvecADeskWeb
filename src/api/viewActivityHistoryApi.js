import axiosClient from './axiosClient';

function normalizeSnap(snap) {
  return {
    userSnapId: snap.userSnapId ?? 0,
    snapOn: snap.snapOn ?? '',
    snapThumbnailPath: snap.snapThumbnailPath ?? null,
    snapOnTime: snap.snapOnTime ?? '',
    snapPath: snap.snapPath ?? '',
    totalClicks: snap.totalClicks ?? 0,
    taskName: snap.taskName ?? '',
  };
}

function normalizeActivityHistory(activity) {
  return {
    userTrackingId: activity.userTrackingId ?? 0,
    userId: activity.userId ?? 0,
    machineName: activity.machineName ?? '',
    startOn: activity.startOn ?? '',
    endOn: activity.endOn ?? '',
    timeRange: activity.timeRange ?? '',
    snaps: (activity.snaps ?? []).map(normalizeSnap),
  };
}


export async function getActivityHistoryByUserId({ userId, date }) {
  const params = { userId };
  if (date) {
    params.date = new Date(date).toISOString().split('T')[0];
  }

  const { data } = await axiosClient.get('/api/ViewActivityHistory/ViewActivityHistoryByUserId', { params });

  const activities = Array.isArray(data) ? data : (data?.data ?? []);

  return activities.map(normalizeActivityHistory);
}
