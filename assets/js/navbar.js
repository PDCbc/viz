/**
 * Created by sdiemert on 15-08-24.
 */


/**
 * Sets the color of the navbar tab associated with the page.
 *
 * @param field {String} one of the id of the navbar div elements, one of:
 *  - navbar-polypharmacy
 *  - navbar-population-health
 *  - navbar-practice-reflection
 *  - navbar-data-quality
 *  - navbar-attachment
 */
function setNavbarColor(field) {

    //console.log("setNavbarColor("+field+")");

    //reset old navbar colors.
    $("#navbar-attachment").css("background-color", "white");
    $("#navbar-polypharmacy").css("background-color", "white");
    $("#navbar-population-health").css("background-color", "white");
    $("#navbar-practice-reflection").css("background-color", "white");
    $("#navbar-data-quality").css("background-color", "white");

    if (field) {

        $("#" + field).css("background-color", "#e6e6e6");

    }

}

/**
 * Source: http://stackoverflow.com/a/901144
 * @param name {String} the name of the parameter we are looking for.
 * @returns {String} the value of the parameter or null if it is not provided.
 */
function getParameterByName(name) {
    name        = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex   = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
