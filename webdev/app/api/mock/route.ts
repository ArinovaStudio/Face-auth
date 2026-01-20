import { NextResponse } from "next/server";

// Scimulation of actual AI response
export async function POST() {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const isOverloaded = Math.random() < 0.2; 
    
    // if api fails
    if (isOverloaded) {
      return NextResponse.json( { error: "Model Inference Failed" }, { status: 503 });
    }

    return NextResponse.json({
      verified: true,
      confidence: 98.5,
      livenessScore: 99.1,
      matchFound: true
    });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: "Internal AI Error" }, { status: 500 });
  }
}