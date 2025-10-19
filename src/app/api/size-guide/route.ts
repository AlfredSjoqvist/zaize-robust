import { NextResponse } from "next/server";


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

export async function GET() {
  return NextResponse.json({ message: "POST a JSON body to echo it back." }, { headers: cors });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    return NextResponse.json(data, { headers: cors });
  } catch {
    return NextResponse.json("error ;(", { headers: cors });
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: cors });
}
