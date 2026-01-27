import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkUser } from "@/lib/auth";
import z from "zod";
import { formatZodErrors } from "@/lib/utils";

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  webhookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export async function PUT( req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await checkUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json();

    const validation = projectSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json( { success: false, message: "Validation failed", errors: formatZodErrors(validation.error) }, { status: 400 });
    }

    const { name, description, webhookUrl } = validation.data;

    const existingProject = await prisma.project.findUnique({ where: { id: projectId } });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    if (existingProject.userId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden: You do not own this project" }, { status: 403 });
    }

    if (name !== existingProject.name) {
      const nameConflict = await prisma.project.findFirst({ where: { userId: user.id, name }});
      if (nameConflict) {
        return NextResponse.json({ success: false, message: "Project name already exists" },{ status: 409 });
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description,
        webhookUrl: webhookUrl || null,
      }
    });

    return NextResponse.json({ success: true, message: "Project updated", project: updatedProject });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await checkUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const existingProject = await prisma.project.findUnique({ where: { id: projectId } });

    if (!existingProject) {
      return NextResponse.json({ success: false, message: "Project not found" }, { status: 404 });
    }

    if (existingProject.userId !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden: You do not own this project" }, { status: 403 });
    }

    await prisma.project.delete({ where: { id: projectId } });

    return NextResponse.json({ success: true, message: "Project deleted successfully" });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}