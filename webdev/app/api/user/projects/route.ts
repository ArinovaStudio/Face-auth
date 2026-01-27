import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import z from "zod";
import { checkUser } from "@/lib/auth";
import { formatZodErrors } from "@/lib/utils";

export async function GET() {
  try {
    const user = await checkUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, projects });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch projects" }, { status: 500 });
  }
}

const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  webhookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await checkUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = projectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json( { success: false, message: "Validation failed", errors: formatZodErrors(validation.error) }, { status: 400 });
    }

    const { name, description, webhookUrl } = validation.data;

    const existingProject = await prisma.project.findFirst({
      where: { userId: user.id, name }
    });

    if (existingProject) {
      return NextResponse.json( {  success: false, message: "Project already exists" }, { status: 409 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
       return NextResponse.json({ success: false, message: "No active subscription found" }, { status: 403 });
    }

    const currentProjectCount = await prisma.project.count({ where: { userId: user.id } });

    if (currentProjectCount >= subscription.plan.maxProjects) {
      return NextResponse.json({ success: false, message: `Plan limit reached. Your plan (${subscription.plan.name}) allows ${subscription.plan.maxProjects} projects.` }, { status: 403 });
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        description,
        webhookUrl: webhookUrl || null,
      }
    });

    return NextResponse.json({ success: true, message: "Project created", project }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}