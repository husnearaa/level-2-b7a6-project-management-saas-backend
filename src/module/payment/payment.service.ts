import Stripe from "stripe";
import {
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type {
  ICreateCheckoutPayload,
  IPaymentQuery,
  IStripeWebhookResult,
} from "./payment.interface";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const getStripePriceId = (
  plan: Exclude<SubscriptionPlan, "FREE">,
): string => {
  const priceId = process.env[`STRIPE_PRICE_${plan}`];

  if (!priceId) {
    throw new AppError(
      500,
      `Stripe price is not configured for ${plan} plan`,
    );
  }

  return priceId;
};

const createCheckoutSession = async (
  userId: string,
  payload: ICreateCheckoutPayload,
) => {
  const { plan } = payload;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const existingPendingPayment = await prisma.payment.findFirst({
    where: {
      userId,
      status: PaymentStatus.PENDING,
    },
    select: {
      id: true,
      stripeSessionId: true,
    },
  });

  if (existingPendingPayment) {
    throw new AppError(
      409,
      "You already have a pending payment",
    );
  }

  const stripePriceId = getStripePriceId(plan);

  let subscription = await prisma.subscription.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.INACTIVE,
      },
    });
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      amount: 0,
      currency: "USD",
      provider: "STRIPE",
      status: PaymentStatus.PENDING,
    },
  });

  try {
    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],

        customer_email: user.email,

        success_url:
          `${process.env.FRONTEND_URL}/payment/success` +
          `?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${process.env.FRONTEND_URL}/payment/cancel`,

        metadata: {
          paymentId: payment.id,
          userId: user.id,
          plan,
          subscriptionId: subscription.id,
        },
      });

    if (!checkoutSession.url) {
      throw new AppError(
        500,
        "Stripe checkout URL was not generated",
      );
    }

    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        stripeSessionId: checkoutSession.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "PAYMENT_CREATED",
        entity: "PAYMENT",
        entityId: payment.id,
        newData: {
          plan,
          stripeSessionId: checkoutSession.id,
        },
      },
    });

    return {
      paymentId: payment.id,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      plan,
    };
  } catch (error) {
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    throw error;
  }
};

const getMyPayments = async (
  userId: string,
  query: IPaymentQuery,
) => {
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
  };

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      select: {
        id: true,
        amount: true,
        currency: true,
        provider: true,
        status: true,
        stripeSessionId: true,
        stripePaymentIntentId: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,

        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
          },
        },
      },
    }),

    prisma.payment.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: payments,

    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string | string[] | undefined,
): Promise<IStripeWebhookResult> => {
  if (!signature || Array.isArray(signature)) {
    throw new AppError(
      400,
      "Stripe webhook signature is missing",
    );
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(
      500,
      "Stripe webhook secret is not configured",
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    throw new AppError(
      400,
      "Invalid Stripe webhook signature",
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data
        .object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        break;
      }

      const paymentId =
        session.metadata?.paymentId;

      const userId =
        session.metadata?.userId;

      const plan =
        session.metadata?.plan as
          | Exclude<SubscriptionPlan, "FREE">
          | undefined;

      const subscriptionId =
        session.metadata?.subscriptionId;

      if (
        !paymentId ||
        !userId ||
        !plan ||
        !subscriptionId
      ) {
        throw new AppError(
          400,
          "Required payment metadata is missing",
        );
      }

      const existingPayment =
        await prisma.payment.findUnique({
          where: {
            id: paymentId,
          },

          select: {
            id: true,
            status: true,
            stripeEventId: true,
          },
        });

      if (!existingPayment) {
        throw new AppError(
          404,
          "Payment record not found",
        );
      }

      if (
        existingPayment.stripeEventId === event.id ||
        existingPayment.status === PaymentStatus.PAID
      ) {
        return {
          received: true,
          message: "Payment event already processed",
        };
      }

      // Stripe amount_total is in the smallest
      // currency unit (for USD, cents).
      // Example: $20.00 = 2000 cents.
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: {
            id: paymentId,
          },

          data: {
            amount: session.amount_total
              ? session.amount_total / 100
              : 0,

            status: PaymentStatus.PAID,

            stripeEventId: event.id,

            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,

            paidAt: new Date(),
          },
        });

        await tx.subscription.update({
          where: {
            id: subscriptionId,
          },

          data: {
            plan,

            status: SubscriptionStatus.ACTIVE,

            currentPeriodStart: new Date(),

            currentPeriodEnd: new Date(
              Date.now() +
                30 * 24 * 60 * 60 * 1000,
            ),

            cancelAtPeriodEnd: false,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "PAYMENT_COMPLETED",
            entity: "PAYMENT",
            entityId: paymentId,

            newData: {
              stripeEventId: event.id,
              plan,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "SUBSCRIPTION_UPDATED",
            entity: "SUBSCRIPTION",
            entityId: subscriptionId,

            newData: {
              plan,
              status: SubscriptionStatus.ACTIVE,
            },
          },
        });
      });

      break;
    }

    case "checkout.session.expired": {
      const session = event.data
        .object as Stripe.Checkout.Session;

      const paymentId =
        session.metadata?.paymentId;

      if (!paymentId) {
        break;
      }

      const payment =
        await prisma.payment.findUnique({
          where: {
            id: paymentId,
          },

          select: {
            id: true,
            status: true,
            stripeEventId: true,
            userId: true,
          },
        });

      if (!payment) {
        break;
      }

      if (
        payment.stripeEventId === event.id ||
        payment.status !== PaymentStatus.PENDING
      ) {
        break;
      }

      await prisma.payment.update({
        where: {
          id: paymentId,
        },

        data: {
          status: PaymentStatus.CANCELED,
          stripeEventId: event.id,
        },
      });

      break;
    }

    default:
      break;
  }

  return {
    received: true,
    message: "Stripe webhook received successfully",
  };
};

export const paymentService = {
  createCheckoutSession,
  getMyPayments,
  handleStripeWebhook,
};