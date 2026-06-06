import { errorResponse } from "@/utils/response";
export async function PATCH() {
  return errorResponse("Store categories are no longer supported", 410);
}

export async function DELETE() {
  return errorResponse("Store categories are no longer supported", 410);
}
