const express = require("express");
const router = express.Router(); //suur "R" on oluline!
const general = require("../generalFnc");
//kõikidele marsruutidele ühine vahevara

router.use(general.checkLogin);

const {
	filmHome,
	addFilm,
	addingFilm,
	filmCharacters } = require("../controllers/filmControllers");


// igale marsruudile oma osa nagu seni index failis

//app.get("/news", (req, res)=>{
router.route("/").get(filmHome);

router.route("/lisaseos").get(addFilm);

router.route("/lisaseos").post(addingFilm);

router.route("/tegelased").get(filmCharacters);

module.exports = router;