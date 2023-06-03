const router = require('express').Router();
const mysqlPool = require('../lib/mysqlPool');

exports.router = router;

const { businesses } = require('./businesses');
const { reviews } = require('./reviews');
const { photos } = require('./photos');

async function getBusinessByUserId(userid) {
  const [ results ] = await mysqlPool.query(
    'SELECT * FROM businesses WHERE ownerid = ?',
    [ userid ]
  );
  
  return results[0];
}

/*
 * Route to list all of a user's businesses.
 */
router.get('/:userid/businesses', async (req, res) => {
  try {
    const userid = parseInt(req.params.userid);
    const business = await getBusinessByUserId(userid);
    if (business) {
      res.status(200).json({
        links: {
          business: `/businesses/${userid.businessid}`
        }
      });
    } else {
      res.status(404).json({
        error: "User not found"
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Unable to fetch user's businesses."
    });
  }
});

async function getUsersCount() {
  const [ results ] = await mysqlPool.query(
    'SELECT COUNT(*) AS count FROM users'
  );

  return results[0].count;
}

async function getUsersPage(page) {
  const count = await getUsersCount();
  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const [ results ] = await mysqlPool.query(
    'SELECT * FROM users ORDER BY id LIMIT ?,?',
    [ offset, pageSize ]
  );

  return {
    users: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  };
}

/*
 * Route to list all of a user's reviews.
 */
router.get('/:userid/reviews', async (req, res) => {
  try {
    const usersPage = await getUsersPage(parseInt(req.query.page) || 1);
    // filter to just users reviews
    usersPage.users = usersPage.users.map(user => {
      user.reviews = reviews.filter(review => review && review.userid === user.id);
      return user;
    });
    res.status(200).send(usersPage);
  } catch (err) {
    res.status(500).json({
      error: "Unable to fetch user's reviews."
    });
  }
});

/*
 * Route to list all of a user's photos.
 */
router.get('/:userid/photos', async (req, res) => {
  try {
    const usersPage = await getUsersPage(parseInt(req.query.page) || 1);
    // filter to just users photos
    usersPage.users = usersPage.users.map(user => {
      user.photos = photos.filter(photo => photo && photo.userid === user.id);
      return user;
    });
    res.status(200).send(usersPage);
  } catch (err) {
    res.status(500).json({
      error: "Unable to fetch user's photos."
    });
  }
});
