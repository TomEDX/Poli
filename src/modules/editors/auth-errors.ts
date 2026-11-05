// Supabase Auth error codes the sign-in flow reacts to.
export enum AuthErrorCode {
  // Sign-ups are closed, so an address without an account gets one of these.
  OtpDisabled = "otp_disabled",
  SignupDisabled = "signup_disabled",
  UserNotFound = "user_not_found",
}

const unknownAccountCodes = new Set<string>([
  AuthErrorCode.OtpDisabled,
  AuthErrorCode.SignupDisabled,
  AuthErrorCode.UserNotFound,
]);

export function isUnknownAccount(code: string | undefined): boolean {
  return code !== undefined && unknownAccountCodes.has(code);
}
