import { Deal } from "../models/dealModel.js";

const now = () => new Date();

export const getActiveDealCriteria = (dealType) => {
  const date = now();
  const criteria = {
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date },
  };

  if (dealType) {
    criteria.dealType = dealType;
  }

  return criteria;
};

export const deactivateExpiredDeals = async () => {
  const date = now();
  await Deal.updateMany(
    {
      isActive: true,
      endDate: { $lt: date },
    },
    {
      $set: { isActive: false },
    }
  );
};

