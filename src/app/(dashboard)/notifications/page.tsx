import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils/formatDate";
import { Bell, CheckCircle, Circle } from "lucide-react";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) {
    return <div className="text-red-600">Unauthorized</div>;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Notifications</h1>
          <p className="text-[13px] text-gray-500 mt-1">Your latest platform alerts and activity updates.</p>
        </div>
        <Link href="/profile" className="text-indigo-600 text-[12px] font-medium hover:text-indigo-700">
          Manage your profile
        </Link>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No notifications yet.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-5 py-4 bg-white ${item.isRead ? "border-gray-200" : "border-indigo-300 bg-indigo-50"}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 text-indigo-600">
                  {item.isRead ? <Circle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-semibold text-gray-900">{item.title}</h2>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[13px] text-gray-600">{item.message}</p>
                  {item.relatedType && item.relatedId && (
                    <p className="mt-2 text-[12px] text-gray-400">Related: {item.relatedType} #{item.relatedId}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
