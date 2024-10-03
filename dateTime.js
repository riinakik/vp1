const monthNamesET =["jaanuar", "veebruar", "märts", "aprill", "mai", "juuni", "juuli", "august", "september", "oktoober", "november", "detsember"]; 
const dayNamesET =["pühapäev", "esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede", "laupäev"];

const dateEt = function(){
//function dateEt(){
let timeNow = new Date();
console.log("Praegu on: " + timeNow);
let dateNow = timeNow.getDate();
let monthNow = timeNow.getMonth();
let yearNow = timeNow.getFullYear();
//console.log("Praegu on " + dateNow + "." + (monthNow + 1) + "." + yearNow);
//console.log("Praegu on " + dateNow + ". " + monthNamesET[monthNow] + " " + yearNow);

let dateNowEt = dateNow + ". " + monthNamesET[monthNow] + " " + yearNow;
return dateNowEt;
}

const dayEt = function(){
  let day = new Date();
  let dayNow = day.getDay();
  let dayNowEt = dayNamesET[dayNow];
  return dayNowEt;
}

const hoursEt = function(){
 let hours = new Date();
 let hoursNow = hours.getHours();
 let minutesNow = hours.getMinutes();
 let secondsNow = hours.getSeconds();
 let hourNowEt =  hoursNow + "h " + minutesNow + "min ja " + secondsNow +"sec";
 return hourNowEt;
}

const partOfDay = function(){
	let dayPart = "suvaline hetk";
	let timeNow = new Date();
	if(timeNow.getHours() >= 8 &&  timeNow.getHours() < 18 && (timeNow.getDay() > 0 && timeNow.getDay() < 6)){
		dayPart = "AEG ÕPPIMISEKS!";
	}else 
       {dayPart = "AEG PUHKAMISEKS!";
	}
	return dayPart;
	
}

module.exports = {monthsEt: monthNamesET, daysEt: dayNamesET, dateEt: dateEt, dayEt: dayEt, hoursEt: hoursEt, partOfDay: partOfDay};