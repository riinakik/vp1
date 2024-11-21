const express = require("express");
const router = express.Router(); //suur "R" on oluline!
const general = require("../generalFcs");
//kõikidele marsruutidele ühine vahevara

router.use(general.checkLogin);

const {
	newsHome,
	addNews,
	addingNews,
	newsHeadings } = require("../controllers/newsControllers");


// igale marsruudile oma osa nagu seni index failis

//app.get("/news", (req, res)=>{
router.route("/").get(newsHome);

router.route("/addnews").get(addNews);

router.route("/addnews").get(addingNews);

router.route("/shownews").get(newsHeadings);

module.exports = router;