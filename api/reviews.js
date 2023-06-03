const router = require('express').Router();
const mysqlPool = require('../lib/mysqlPool');
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const reviews = require('../data/reviews');

exports.router = router;
exports.reviews = reviews;

/*
 * Schema describing required/optional fields of a review object.
 */
const reviewSchema = {
  userid: { required: true },
  businessid: { required: true },
  dollars: { required: true },
  stars: { required: true },
  review: { required: false }
};

async function insertNewReview(review) {
  const validatedReview = extractValidFields(
    review,
    reviewSchema
  );

  const [result] = await mysqlPool.query(
    'INSERT INTO reviews SET ?',
    validatedReview
  );

  return result.insertId;
};

/*
 * Route to create a new review.
 */
router.post('/', async (req, res) => {
  if (validateAgainstSchema(req.body, reviewSchema)) {
    try {
      const id = await insertNewReview(req.body);
      res.status(201).send({
        id: id,
        links: {
          review: `/reviews/${id}`,
          business: `/businesses/${req.body.businessid}`
        }
      });
    } catch (err) {
      res.status(500).send({
        error: "Error inserting review into DB."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid review object."
    });
  }
});

async function getReviewByID(reviewId) {
  const [results] = await mysqlPool.query(
    'SELECT * FROM reviews WHERE id = ?',
    [reviewId]
  );

  return results[0];
};

/*
 * Route to fetch info about a specific review.
 */
router.get('/:reviewID', async (req, res, next) => {
  try {
    const review = await getReviewByID(parseInt(req.params.reviewID));
    if (review) {
      res.status(200).send(review);
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to fetch review."
    });
  }
});

async function updateReviewById(reviewId, review) {
  const validatedReview = extractValidFields(
    review,
    reviewSchema
  );

  const [result] = await mysqlPool.query(
    'UPDATE reviews SET ? WHERE id = ?',
    [validatedReview, reviewId]
  );

  return result.affectedRows > 0;
}

/*
 * Route to update a review.
 */
router.put('/:reviewID', async (req, res, next) => {
  if (validateAgainstSchema(req.body, reviewSchema)) {
    try {
      const updateSuccessful = await updateReviewById(parseInt(req.params.reviewID), req.body);
      if (updateSuccessful) {
        res.status(200).send({
          links: {
            review: `/reviews/${req.params.reviewID}`,
            business: `/businesses/${req.body.businessid}`
          }
        });
      } else {
        next();
      }
    } catch (err) {
      res.status(500).send({
        error: "Unable to update review."
      });
    }
  } else {
    res.status(400).send({
      error: "Request body does not contain a valid review object."
    });
  }
});

async function deleteReviewById(reviewId) {
  const [result] = await mysqlPool.query(
    'DELETE FROM reviews WHERE id = ?',
    [reviewId]
  );

  return result.affectedRows > 0;
};

/*
 * Route to delete a review.
 */
router.delete('/:reviewID', async (req, res, next) => {
  try {
    const deleteSuccessful = await deleteReviewById(parseInt(req.params.reviewID));
    if (deleteSuccessful) {
      res.status(204).end();
    } else {
      next();
    }
  } catch (err) {
    res.status(500).send({
      error: "Unable to delete review."
    });
  }
});
