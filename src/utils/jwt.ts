import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

const createToken = (
  payload: JwtPayload | object,
  secret: string,
  expiresIn: string | number
) => {
  const options: SignOptions = {};

  if (expiresIn !== undefined) {
    options.expiresIn = expiresIn as NonNullable<
      SignOptions["expiresIn"]
    >;
  }

  return jwt.sign(
    payload,
    secret,
    options
  );
};

const verifyToken = (
  token: string,
  secret: string
) => {
  try {
    const verifiedToken = jwt.verify(
      token,
      secret
    );

    return {
      success: true as const,
      data: verifiedToken,
    };
  } catch (error) {
    return {
      success: false as const,
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