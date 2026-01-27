import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { checkUser } from "@/lib/auth";
import z from "zod";
import { formatZodErrors } from "@/lib/utils";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { monthlyPrice: 'asc' }});
    return NextResponse.json({ success: true, plans });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch plans" }, { status: 500 });
  }
}

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  monthlyPrice: z.number().min(0, "Price cannot be negative"),
  apiCallLimit: z.number().int().positive("API limit must be a positive integer"),
  maxProjects: z.number().int().positive("Max projects must be a positive integer"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await checkUser();
    if (!user || user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const validation = planSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json( { success: false, message: "Validation failed", errors: formatZodErrors(validation.error) },{ status: 400 });
    }

    const { name, monthlyPrice, apiCallLimit, maxProjects } = validation.data;

    const existingPlan = await prisma.plan.findUnique({ where: { name } });
    if (existingPlan) {
      return NextResponse.json({ success: false, message: "Plan with this name already exists" }, { status: 409 });
    }

    const plan = await prisma.plan.create({
      data: { name, monthlyPrice, apiCallLimit, maxProjects }
    });

    return NextResponse.json({ success: true, message: "Plan created", plan }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}