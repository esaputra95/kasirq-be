import moment, { MomentInput } from "moment";

export const toDbDateOnly = (value?: MomentInput) => {
    const parsed = value ? moment(value) : moment();
    const date = parsed.isValid() ? parsed : moment();

    return new Date(`${date.format("YYYY-MM-DD")}T00:00:00.000Z`);
};
