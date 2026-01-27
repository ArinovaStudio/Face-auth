import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import z from "zod";
import { checkUser } from "@/lib/auth";
import { formatZodErrors } from "@/lib/utils";

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  monthlyPrice: z.number().min(0, "Price cannot be negative"),
  apiCallLimit: z.number().int().positive("API limit must be a positive integer"),
  maxProjects: z.number().int().positive("Max projects must be a positive integer"),
});

export async function PUT( req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await checkUser();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const validation = planSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json( { success: false, message: "Validation failed", errors: formatZodErrors(validation.error) },{ status: 400 });
    }

    const existingPlan = await prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) {
      return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ success: true, message: "Plan updated", plan: updatedPlan });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Plan not found or update failed" }, { status: 500 });
  }
}


export async function DELETE( req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await checkUser();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const existingPlan = await prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) {
      return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });
    }

    const activeSubs = await prisma.subscription.count({ where: { planId: id }}); 
    if (activeSubs > 0) {
      return NextResponse.json( { success: false, message: "Cannot delete plan. There are active subscriptions using it." }, { status: 400 });
    }

    await prisma.plan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Plan deleted successfully" });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to delete plan" }, { status: 500 });
  }
}