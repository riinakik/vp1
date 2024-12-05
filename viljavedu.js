const express = require("express");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
const bodyparser = require("body-parser");           //päringulahtiharutamiseks POST päringute puhul

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended: true}));   //päringu urli parsimine, false, kui ainult tekst

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

const async = require("async");

app.get("/", (req, res) => {
    res.render("viljavedu"); // pealeht
});

app.get("/input", (req, res) => {
    res.render("input", {notice: ""}); // kuva andmete sisestamise leht
});

app.post("/input", (req, res) => {
    let notice = "";
    let truck = req.body.truckInput;
    let input = req.body.weightInput;
    let output = req.body.weightOutput;

    if (!truck || !input) {
        notice = "Osa andmeid sisestamata!";
    }

    if (notice) {
        res.render("addnews", { notice, truck, input, output });  
    } else {
       
        let sqlreq = "INSERT INTO viljavedu (truck, weight_in, weight_out) VALUES (?, ?, ?)";

        console.log("Sisestatud väärtused:", truck, input, output);
        conn.query(sqlreq, [truck, input, output || null], (err, sqlres) => {
            if (err) {
                throw err;
            } else {
                notice = "Andmed edukalt registreeritud!!";
                // Lähtestame väljad pärast edukat registreerimist
                res.render("input", { notice, truck, input, output });
            }
        });
    }
}); 

app.get("/middle", (req, res) => {
  // Päring, et valida autod, mille weightOutput on null
  let sqlReq = "SELECT truck FROM viljavedu WHERE weight_out IS NULL";
  
  conn.query(sqlReq, (err, results) => {
    if (err) throw err;
    
    // Edastame EJS-failile tulemused
    res.render("middle", {notice: "", carList: results });
  });
});

app.post("/middle", (req, res) => {
    let notice = "";
    let truck = req.body.truckSelect; // Vali auto, mille kaal sisestatakse
    let output = req.body.weightOutput; // Väljundkaal

    // Kontrollime, kas kõik vajalikud andmed on sisestatud
    if (!truck || !output) {
        notice = "Osa andmeid sisestamata!";
        res.render("middle", { notice, truck, output, carList: [] });  
        return;
    }

    // Kui andmed on olemas, täidame värskendamise päringu
    let sqlReq = "UPDATE viljavedu SET weight_out = ? WHERE truck = ? AND weight_out IS NULL";

    console.log("Sisestatud väärtused:", truck, output);

    conn.query(sqlReq, [output, truck], (err, sqlRes) => {
        if (err) {
            throw err;
        } else {
            // Kui andmed edukalt salvestatud, kuvatakse teadet
            notice = "Andmed edukalt registreeritud!";
            res.render("middle", { notice, truck, output, carList: [] });
        }
    });
});

app.get("/output", (req, res) => {
    // Autonumber (truck) saab tulla URL query parameetrina, näiteks ?truck=autoNumbri
    const truckFilter = req.query.truck || null; // Kui pole määratud, siis `null`

    // Kogumass kogu viljavedu kohta, kus weight_out on olemas
    let sqlReq = "SELECT SUM(weight_in - weight_out) AS total_mass FROM viljavedu WHERE weight_out IS NOT NULL";
    let queryParams = [];

    // Kui on autonumbri filter, siis lisame tingimuse ka sellele
    if (truckFilter) {
        sqlReq += " AND truck = ?";
        queryParams.push(truckFilter);
    }

    conn.query(sqlReq, queryParams, (err, totalResult) => {
        if (err) {
            throw err;
        }

        // Kõik koormad (või filteeritud auto koormad), kus weight_out on olemas
        let truckReq = "SELECT truck, weight_in, weight_out, (weight_in - weight_out) AS mass FROM viljavedu WHERE weight_out IS NOT NULL";

        // Kui on autonumbri filter, siis lisame tingimuse ka sellele
        if (truckFilter) {
            truckReq += " AND truck = ?";
            queryParams.push(truckFilter);
        }

        conn.query(truckReq, queryParams, (err, truckResult) => {
            if (err) {
                throw err; // Vea korral viskame vea
            }

            // Otsime kõik autod, et neid rippmenüüs kuvataks
            const carListReq = "SELECT DISTINCT truck FROM viljavedu";
            conn.query(carListReq, (err, carListResult) => {
                if (err) {
                    throw err;
                }

                // Renderdame tulemused templaatile, lisades truckFilter ja carList muutujad
                res.render("output", { 
                    total_mass: totalResult[0].total_mass, // Kogu vilja mass
                    truckResult,
                    truckFilter, // Saadame truckFilter muutujat EJS-le
                    carList: carListResult // Saadame kõigi autode nimekirja
                });
            });
        });
    });
});



/* 
app.get("/output", (req, res) => {
    // Autonumber (truck) saab tulla URL query parameeterena
    const truckFilter = req.query.truck; // Eeldame, et URLis on küsimuse parameeter nagu ?truck=autoNumbri

    // Kogumass kõigile koormatele, kus weight_out on olemas
    let sqlReq = "SELECT SUM(weight_in - weight_out) AS total_mass FROM viljavedu WHERE weight_out IS NOT NULL";
    let queryParams = [];

    // Kui on autonumbri filter, siis lisame tingimuse ka sellele
    if (truckFilter) {
        sqlReq += " AND truck = ?";
        queryParams.push(truckFilter);
    }

    conn.query(sqlReq, queryParams, (err, totalResult) => {
        if (err) {
            throw err;
        }

        // Kõik koormad (või filteeritud auto koormad), kus weight_out on olemas
        let truckReq = "SELECT truck, weight_in, weight_out, (weight_in - weight_out) AS mass FROM viljavedu WHERE weight_out IS NOT NULL";

        // Kui on autonumbri filter, siis lisame tingimuse ka sellele
        if (truckFilter) {
            truckReq += " AND truck = ?";
            queryParams.push(truckFilter);
        }

        conn.query(truckReq, queryParams, (err, truckResult) => {
            if (err) {
                throw err; // Vea korral viskame vea
            }

            // Renderdame tulemused templaatile
            res.render("output", { 
                total_mass: totalResult[0].total_mass,
                truckResult
            });
        });
    });
});
 */







app.listen(5113);
