import { errorResponse } from "@/utils/response";
export async function GET() {
  return errorResponse("Store categories are no longer supported", 410);
}

export async function POST() {
  return errorResponse("Store categories are no longer supported", 410);
}
