import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Web Vitals]", body);
    
    // Add validation
    if (!body.name || typeof body.value !== 'number') {
      return NextResponse.json({ error: "Invalid body structure" }, { status: 400 });
    }
    
    // Optional: Store in memory or database
    // await saveVitals(body);
    
    return NextResponse.json({ ok: true, received: body }, { status: 200 });
  } catch (error) {
    console.error("[Web Vitals Error]", error);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}