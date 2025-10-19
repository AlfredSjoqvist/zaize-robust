import { NextResponse } from "next/server";

const HARD_CODED = {
  chest: [110, 118],
  waist: [78, 86],
  right_arm: [30, 36],
  left_arm: [30, 36],
  neckline: [38, 42],
  left_leg: [88, 96],
  right_leg: [88, 96],
  low_hip: [95, 103],
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "no-store",
};

export async function GET() {
  return NextResponse.json(HARD_CODED, { headers: cors });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    return NextResponse.json(data, { headers: cors });
  } catch {
    return NextResponse.json(HARD_CODED, { headers: cors });
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: cors });
}
