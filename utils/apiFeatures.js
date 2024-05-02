class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // FILTER OUT OTHER ELEMENTS FROM REQ.QUERY OBJECT
    const queryObj = { ...this.queryString };
    const excludeEl = ['sort', 'page', 'limit', 'fields'];
    excludeEl.forEach((el) => delete queryObj[el]);

    // ADDING '$' TO MONGO OPERATORS (FILTERING)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|lt|lte)\b/g, (match) => `$${match}`);
    const queryObj1 = JSON.parse(queryStr);

    // LOOP THROUGH QUERY.OBJ TO CONVERT STRINGED-NUMBERS TO NUMBERS (FILTERING)
    Object.keys(queryObj1).forEach((key) => {
      if (!isNaN(queryObj1[key])) {
        queryObj1[key] = parseFloat(queryObj1[key]);
      }
    });

    this.query = this.query.find(queryObj1);
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitingFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 50;
    const skip = (page - 1) * limit;

    //   if(this.queryString.page ) {
    //     const docNumber = await Model.countDocuments()
    //     if(skip > docNumber) {
    //    throw new Error ('No page found')
    //   }
    //   console.log(docNumber)
    // }
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;

// Test
