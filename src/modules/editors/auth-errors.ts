// Supabase Auth error codes the sign-in flow reacts to.
export enum AuthErrorCode {
  // Sign-ups are closed, so an address without an account gets one of these.
  OTP_DISABLED = "otp_disabled",
  SIGNUP_DISABLED = "signup_disabled",
  USER_NOT_FOUND = "user_not_found",
}

const unknownAccountCodes = new Set<string>([
  AuthErrorCode.OTP_DISABLED,
  AuthErrorCode.SIGNUP_DISABLED,
  AuthErrorCode.USER_NOT_FOUND,
]);

export function isUnknownAccount(code: string | undefined): boolean {
  return code !== undefined && unknownAccountCodes.has(code);
}
