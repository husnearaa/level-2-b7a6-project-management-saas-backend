
import { OAuth2Client } from "google-auth-library";

import config from "../config";

const googleClient = new OAuth2Client(
  config.GOOGLE_CLIENT_ID
);

export const verifyGoogleIdToken = async (
  idToken: string
) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google ID token");
  }

  if (!payload.sub || !payload.email) {
    throw new Error(
      "Google account information is incomplete"
    );
  }

  if (!payload.email_verified) {
    throw new Error(
      "Google email is not verified"
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name ?? "Google User",
  };
};




// import { OAuth2Client } from "google-auth-library";
// import config from "../config";

// export const googleClient = new OAuth2Client({
// 	client_id: config.google_client_id,
// });