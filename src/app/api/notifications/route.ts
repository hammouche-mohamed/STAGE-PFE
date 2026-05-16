import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countOnly = searchParams.get("count") === "true";
    const unreadOnly = searchParams.get("unread") === "true";

    const securitySeen = req.cookies.get("security_notif_seen")?.value === "true";

    if (countOnly) {
      const dbCount = await prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      });
      const totalCount = (session.user.mustChangePassword && !securitySeen) ? dbCount + 1 : dbCount;
      return NextResponse.json({ count: totalCount });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (session.user.mustChangePassword) {
      if (unreadOnly && securitySeen) {
        // Skip
      } else {
        const securityNotif = {
          id: "security-password-change",
          title: "Security Action Required",
          message: "Your account requires a password update. Please change your password in the profile settings to secure your account.",
          isRead: securitySeen,
          createdAt: new Date().toISOString(),
          type: "SECURITY",
          relatedType: "SECURITY",
          link: "/profile"
        };
        notifications.unshift(securityNotif as any);
      }
    }

    return NextResponse.json({ data: notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Internal server error", count: 0, data: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.markAll) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });

      const response = NextResponse.json({ success: true });
      response.cookies.set("security_notif_seen", "true", {
        maxAge: 60 * 60 * 24,
        path: '/',
      });
      return response;
    }

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: session.user.id },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      await prisma.notification.deleteMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ success: true });
    }

    if (id) {
      await prisma.notification.delete({
        where: { id, userId: session.user.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No ID provided" }, { status: 400 });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
