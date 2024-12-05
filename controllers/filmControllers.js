const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});


//@desc home page for news section
//@route GET /news
//@access private

const filmHome = (req, res)=>{                             //NÄITA EESTIFILM LEHTE
	res.render ("filmindex", {userName: req.session.firstName + " " + req.session.lastName});
};

//@desc page for adding news 
//@route GET /news/addnews
//@access private

const addFilm = (req, res) => {  
    //võtan kasutusele asünk mooduli, et korraga teha mitu andmebaasi päringut
	const filmQueries = [
		function(callback){
			let sqlReq1 = "SELECT id, first_name, last_name, birth_date FROM person";
			conn.execute(sqlReq1, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq2 = "SELECT id, title, production_year FROM movie";
			conn.execute(sqlReq2, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq3 = "SELECT id, position_name FROM position";
			conn.execute(sqlReq3, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		}
	];
	//paneme need päringud e funktsioonid paralleelselt käima, tulemuseks saame kolme päringu koondi
	async.parallel(filmQueries, (err, results)=>{
		if(err){
			throw err;
		}
		else{
			console.log(results);
			res.render ("addRelations", {personList: results[0], movieList: results[1], positionList: results[2]});
		}
	});
	//res.render ("addRelations");
};

//@desc page for adding news 
//@route GET /news/addnews
//@access private

const addingFilm = (req, res) => 
    const personId = req.body.personSelect;
    const movieId = req.body.movieSelect;
    const positionId = req.body.positionSelect;
    const role = req.body.roleInput || null;  
    const notice = "Seos salvestatud edukalt!";

    // Kontrollime, et kõik vajalikud andmed on esitatud
    if (!personId || !movieId || !positionId) {
        return res.send("Viga: kõik andmed pole sisestatud!");
    }

    // SQL-päring seose lisamiseks
    let sqlReq = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
    conn.query(sqlReq, [personId, movieId, positionId, role], (err, result) => {
        if (err) {
            console.error("Viga andmete lisamisel:", err);
            throw err;
        } else {
            console.log("Seos salvestatud: ", result.insertId);

            // Andmete uuendamine enne renderdamist
            const sqlPersons = "SELECT id, first_name, last_name, birth_date FROM person";
            const sqlMovies = "SELECT id, title, production_year FROM movie";
            const sqlPositions = "SELECT id, position_name FROM position";

            // Laeme vajalikud andmed andmebaasist
            conn.query(sqlPersons, (err, person) => {
                if (err) {
                    console.error("Viga person andmete laadimisel:", err);
                    throw err;
                }
                console.log("Person andmed:", person);

                conn.query(sqlMovies, (err, movie) => {
                    if (err) {
                        console.error("Viga movie andmete laadimisel:", err);
                        throw err;
                    }
                    console.log("Movie andmed:", movie);

                    conn.query(sqlPositions, (err, position) => {
                        if (err) {
                            console.error("Viga position andmete laadimisel:", err);
                            throw err;
                        }
                        console.log("Position andmed:", position);

                        // Renderime uuendatud andmetega
                        res.render("addRelations", {
                            notice: notice,
                            personList: person || [],
                            movieList: movie || [],
                            positionList: position || []
                        });
                    });
                });
            });
        }
    });
};

//@desc page for reading news 
//@route GET /news/shownews
//@access private

const filmCharacters = (req, res) => {                      // NÄITA FILMITEGELASTE LISTI ANDMEBAASIST
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	let persons = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			persons = sqlres;
			res.render("tegelased", {persons: persons, userName: req.session.firstName + " " + req.session.lastName});
		}
	});	
};

module.exports = {
	filmHome,
	addFilm,
	addingFilm,
	filmCharacters
};



