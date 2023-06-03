const router = require('express').Router();
const mysqlPool = require('../lib/mysqlPool');
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const businesses = require('../data/businesses');
const { reviews } = require('./reviews');
const { photos } = require('./photos');

exports.router = router;
exports.businesses = businesses;

/*
 * Schema describing required/optional fields of a business object.
 */
const businessSchema = {
  ownerid: { required: true },
  name: { required: true },
  address: { required: true },
  city: { required: true },
  state: { required: true },
  zip: { required: true },
  phone: { required: true },
  category: { required: true },
  subcategory: { required: true },
  website: { required: false },
  email: { required: false }
};

async function getBusinessesCount() {  
  const [results ] = await mysqlPool.query(
    'SELECT COUNT(*) AS count FROM businesses'
  )
  
  return results[0].count;
};

async function getBusinessesPage(page) {
  const count = await getBusinessesCount();
  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const [ results ] = await mysqlPool.query(
    'SELECT * FROM businesses ORDER BY id LIMIT ?,?',
    [ offset, pageSize ]
  );

  return {
    businesses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
};

/*
 * Route to return a list of businesses.
 */
router.get('/', async (req, res) => {
  try {
    const businessesPage = await getBusinessesPage(parseInt(req.query.page) || 1);
    res.status(200).send(businessesPage);
  } catch (err) {
    res.status(500).json({
      error: "Error fetching businesses list. Try again later."
    });
  }
});

async function insertNewBusiness(business) {
  const validatedBusiness = extractValidFields(
    business,
    businessSchema
  )

  const [ result ] = await mysqlPool.query(
    'INSERT INTO businesses SET ?',
    validatedBusiness
  );

  return result.insertId;
};

/*
 * Route to create a new business.
 */
router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, businessSchema)) {
    try {
      const id = await insertNewBusiness(req.body);
      res.status(201).send({ id: id });
    } catch (err) {
      res.status(500).send({
        error: "Error inserting business into DB."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid business object."
    });
  }
});

async function getBusinessById(businessId) {
  const [ results ] = await mysqlPool.query(
    'SELECT * FROM businesses WHERE id = ?',
    [ businessId ]
  );
  
  return results[0];
};

/*
 * Route to fetch info about a specific business.
 */
router.get('/:businessid', async (req, res, next) => {
  try {
    const business = await getBusinessById(parseInt(req.params.businessid));
    if (business) {
      res.status(200).send(business);
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to fetch business."
    });
  }
});

async function updateBusinessById(businessId, business) {
  const validatedBusiness = extractValidFields(
    business,
    businessSchema
  );

  const [ result ] = await mysqlPool.query(
    'UPDATE businesses SET ? WHERE id = ?',
    [ validatedBusiness, businessId ]
  );

  return result.affectedRows > 0;
}

/*
 * Route to replace data for a business.
 */
router.put('/:businessid', async (req, res, next) => {
  if (validateAgainstSchema(req.body, businessSchema)) {
    try {
      const updateSuccessful = await updateBusinessById(parseInt(req.params.businessid), req.body);
      if (updateSuccessful) {
        res.status(200).send({
          links: {
            business: `/businesses/${req.params.businessid}`
          }
        });
      } else {
        next();
      }
    } catch (err) {
      res.status(500).send({
        error: "Unable to update business."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body does not contain a valid business."
    });
  }
});

async function deleteBusinessById(businessId) {
  const [ result ] = await mysqlPool.query(
    'DELETE FROM businesses WHERE id = ?',
    [ businessId ]
  );

  return result.affectedRows > 0;
};

/*
 * Route to delete a business.
 */
router.delete('/:businessid', async (req, res, next) => {
  try {
    const deleteSuccessful = await deleteBusinessById(parseInt(req.params.businessid));
    if (deleteSuccessful) {
      res.status(204).end();
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to delete business."
    });
  }
});
