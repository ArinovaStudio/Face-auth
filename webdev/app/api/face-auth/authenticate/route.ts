import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { sendWebhook } from "@/lib/webhook";

async function getUserProjectIds(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true }
  });
  return projects.map(p => p.id);
}

export async function POST(req: NextRequest) {
  let projectId: string | null = null;

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "Missing API Key" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { apiKey },
      include: {
        user: {
          include: {
            subscription: { include: { plan: true } }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ success: false, message: "Invalid API Key" }, { status: 401 });
    }

    projectId = project.id;
    const sub = project.user.subscription;

    if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
      return NextResponse.json({ success: false, message: "No active subscription" }, { status: 403 });
    }

    const monthlyUsage = await prisma.apiLog.count({
      where: {
        projectId: { in: await getUserProjectIds(project.userId) },
        createdAt: { gte: sub.currentPeriodStart },
      }
    });

    if (monthlyUsage >= sub.plan.apiCallLimit) {
      return NextResponse.json({ success: false, message: "Monthly plan limit reached." }, { status: 429 });
    }

    //Rate limit of 4 requests per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentLogs = await prisma.apiLog.count({
      where: {
        projectId: project.id,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentLogs >= 4) {
      return NextResponse.json( { success: false, message: "Rate limit exceeded (4 req/min). Please slow down." }, { status: 429 });
    }

    const formData = await req.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json({ success: false, message: "Missing 'image'" }, { status: 400 });
    }

    const aiFormData = new FormData();
    aiFormData.append("image", image);

    const aiEngineUrl = process.env.AI_ENGINE_URL || "http://147.93.86.218:8000";
    const pythonUrl = `${aiEngineUrl}/authenticate`;

    const aiResponse = await fetch(pythonUrl, {
      method: "POST",
      body: aiFormData,
    });

    if (!aiResponse.ok) {
      await prisma.apiLog.create({ data: { projectId, endpoint: "/authenticate", status: aiResponse.status || 500 }});

      return NextResponse.json(
        { success: false, message: "Server busy: You did too many requests, try after sometime." },
        { status: 503 }
      );
    }

    const aiData = await aiResponse.json();

    // webhook functionality
    if (project.webhookUrl) {
        await sendWebhook(project.webhookUrl, "face_authentication.completed", aiData);
    }

    await prisma.apiLog.create({ data: { projectId, endpoint: "/authenticate", status: 200 }});

    return NextResponse.json({ success: true, data: aiData });

  } catch (error) {
    console.error("Auth Error:", error);
    if (projectId) {
         await prisma.apiLog.create({ data: { projectId, endpoint: "/authenticate", status: 500 }});
    }
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}