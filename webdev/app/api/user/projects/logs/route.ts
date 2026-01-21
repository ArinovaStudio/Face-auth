import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUser } from "@/lib/auth";

export async function GET() {
    try {
    const user = await checkUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
        where: { userId: user.id },
        select: { id: true }
    });

    const projectIds = projects.map(p => p.id);

    const logs = await prisma.apiLog.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: 'desc' },
        take: 50, 
        include: {
            project: { select: { name: true } }
        }
    });

    return NextResponse.json({ success: true, logs });

  } catch (error) {
    console.error("Error fetching project logs:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch projects" }, { status: 500 });
  }
}