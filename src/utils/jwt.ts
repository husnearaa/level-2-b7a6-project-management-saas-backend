import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

const createToken = (
  payload: JwtPayload,
  secret: string,
  expiresIn: NonNullable<SignOptions["expiresIn"]>
) => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

const verifyToken = (
  token: string,
  secret: string
) => {
  try {
    const verifiedToken = jwt.verify(token, secret);

    return {
      success: true,
      data: verifiedToken,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Invalid token",
    };
  }
};

export const jwtUtils = {
  createToken,
  verifyToken,
};