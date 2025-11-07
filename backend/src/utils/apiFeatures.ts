export interface QueryString {
  page?: string;
  sort?: string;
  limit?: string;
  fields?: string;
  search?: string;
  [key: string]: any;
}

const DEFAULT_LIMIT = 50;

class APIFeatures {
  queryText: string;
  queryParams: any[];
  queryString: QueryString;
  whereConditions: string[];
  paramCounter: number;
  allowedSort: Record<string, string>; // map api→sql column

  constructor(
    queryText: string,
    queryParams: any[],
    queryString: QueryString,
    allowedSort: Record<string, string>
  ) {
    this.queryText = queryText;
    this.queryParams = queryParams;
    this.queryString = queryString;
    this.whereConditions = [];
    this.paramCounter = queryParams.length + 1;
    this.allowedSort = allowedSort;
  }

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((el) => delete queryObj[el]);

    Object.keys(queryObj).forEach((key) => {
      if (queryObj[key] !== undefined) {
        this.whereConditions.push(`${key} = $${this.paramCounter}`);
        this.queryParams.push(queryObj[key]);
        this.paramCounter++;
      }
    });

    return this;
  }

  search(fields: string[] = []): this {
    if (this.queryString.search && fields.length > 0) {
      const searchConditions = fields
        .map((field) => `${field} ILIKE $${this.paramCounter}`)
        .join(" OR ");

      this.whereConditions.push(`(${searchConditions})`);
      this.queryParams.push(`%${this.queryString.search}%`);
      this.paramCounter++;
    }
    return this;
  }

  buildWhereClause(): this {
    if (this.whereConditions.length > 0) {
      this.queryText += " WHERE " + this.whereConditions.join(" AND ");
    }
    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort
        .split(",")
        .map((field) => {
          if (field.startsWith("-")) {
            return `${field.substring(1)} DESC`;
          }
          return `${field} ASC`;
        })
        .join(", ");
      this.queryText += ` ORDER BY ${sortBy}`;
    } else {
      this.queryText += " ORDER BY created_at DESC";
    }
    return this;
  }

  paginate(): this {
    const page = parseInt(this.queryString.page || "1");
    const limit = parseInt(this.queryString.limit || "100");
    const offset = (page - 1) * limit;

    this.queryText += ` LIMIT $${this.paramCounter} OFFSET $${
      this.paramCounter + 1
    }`;
    this.queryParams.push(limit, offset);
    this.paramCounter += 2;

    return this;
  }
}

export default APIFeatures;
