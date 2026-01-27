import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { checkUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await checkUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    if (project.userId !== user.id) {
      return NextResponse.json( { success: false, message: "Forbidden: You do not own this project" }, { status: 403 });
    }

    const newApiKey = randomUUID();

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { apiKey: newApiKey }
    });

    return NextResponse.json({ success: true, message: "API Key regenerated successfully", apiKey: updatedProject.apiKey });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}