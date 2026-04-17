import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

interface RevalidateBody {
  id: string;
  secret: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RevalidateBody = await req.json();
    const { id, secret } = body;

    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ message: "Actor ID required" }, { status: 400 });
    }

    revalidateTag(`actor-${id}`, "default");

    return NextResponse.json({
      revalidated: true,
      id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Error revalidating" },
      { status: 500 }
    );
  }
}