/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */

// Few notes
// Application is currently based on Github as being the primarly Oauth method, so the user profile is populated with information mostly from github and the application will not lauch without a github authkey 

var Helpers = {
  add: function(a,b){
    return a + b
  }
}

var Model = {
  startup: function(key){
    // the key parameter here is github key because of reasons stated above
    // test if key is present and decides if the user needs to see the login (first time user) or is directed to display user profile
    if (key) {
      Model.howToDisplayUserProfile();
    } else {
      View.displayLogin();
    }
  },

  howToDisplayUserProfile: function(){
    chrome.storage.sync.get(["userData", "github"], function(result){
      if (result.github_avatar_url){ 
        View.displayUserProfile(result)
      } else {
        Model.getUserData(result.github)
      }
    })
  }, 

  getUserData: function(key){ // should be changed to github username not key
    $.ajax({
      url: "http://localhost:3000/users/" + key, // this needs to be github username rather than github auth key
      method: "GET",
    }).done(function(response){
      Model.storeUserData(response)
      View.displayUserProfile(response)
    })
  },

  getRepoContribs: function(repoURL){
    // I should be sending the token here instead of the username but the token function is asyn and i cant figure it out
    if (repoURL.indexOf("https://github.com/") > -1){
      sendData = {
        repoURL: repoURL,
        userName: $(".user-name").text()
      }
      $.ajax({
      url: 'http://localhost:3000/repositories/contributors',
      method: 'post',
      data: sendData,
      crossDomain: true,
      xhrFields: {
        withCredentials: true
      }
      }).done(function(response){
        View.displayRepoContribs(response)
      });
    } else {
      View.displayRepoContribs(false)
    }
  },

  getCurrentTabUrl: function(callback) {
    var queryInfo = {
      active: true,
      currentWindow: true
    };
    chrome.tabs.query(queryInfo, function(tabs) {
      var tab = tabs[0];
      var url = tab.url;
      callback(url);
    });
  },

  storeUserToken: function(provider, token) {
    var providerKeys = {}
    providerKeys[provider] = token
    debugger
    chrome.storage.sync.set({
      // how to store this dynamicylly by putting provider there?
      apiKeys: providerKeys
    }, function(){
      console.log('stored ' + token + " for provider: " + provider)
    });
  },

  storeUserData: function(userData, callback){
    chrome.storage.sync.set({
      userData: userData
    }, function(){
      callback ? callback() : undefined
    })
  },

  getUserProfileInfo: function(callback){
    chrome.storage.sync.get("userData", function(result){
      debugger
    })
  },

  getUserKey: function(provider, callback){
    userKey = chrome.storage.sync.get( provider, function(result){
      callback(result[provider])
    });
  },

  createNewUser: function(github_info){
    debugger
    $.ajax({
      type: "post",
      url: "http://localhost:3000/users",
      data: github_info,
    }).done(function(response){
      Model.storeUserToken("github", response["access_token"])
      View.displayUserProfile(response)
    })
  },

  apiAuthentication: function(apiProvider){
    var data = {
      provider: apiProvider
    }
    $.ajax({
      type: "post",
      url: "http://localhost:3000/api/webflow",
      // The server has a table with the ApiProviders and their authURL's this is so that all auth can be done through one js function
      data: data
    }).done(function(response){

      // AuthURL is in format 'https://www.coinbase.com/oauth/authorize?response_type=code&client_id=CLIENT_ID&redirect_uri=CHROME_APP_URL/'
      webFlowParams = {interactive: true, url: response["authURL"] };
      chrome.identity.launchWebAuthFlow(webFlowParams, function(redirectUrl){
        // redirectUrl should look something like redirectUrl = "https://ijgbdoboepecdhcicmgomglandeheifn.chromiumapp.org/?code=
        var responseCodeArray = redirectUrl.match('[#\?].*') // make sure the api provided with a code
        if (responseCodeArray.length === 1){
          var codeStr = responseCodeArray[0].split('=')[1]
          $.ajax({
            type: "post",
            url: "http://localhost:3000/api/"+response["name"]+"/code-for-token", // all apiProvider routes have same route name
            data: {code: codeStr}
          }).done(function(response){
            debugger
            // decide if we're creating a user or just adding an authkey 
            if (response.apiProvider === "github"){
              Model.createNewUser(response)
            } else {
              $.ajax({
                method: "PUT",
                url: "http://localhost:3000/users/"+response,
                data: response
              }).done(function(response){
                Model.storeUserToken("github", response["access_token"])
                View.displayUserProfile(response)
              })
            }
          })
        }
        else {
          alert('Something went wrong');
        }
      });
    })

  },

  checkContribs: function(contribsUserNamesArray){
      $.ajax({
        url: "http://localhost:3000/api/github/check-usernames",
        type: "POST",
        data: {usernamesArray: contribsUserNamesArray}
    }).done(function(response){
      debugger
      response
    })
  },

  sendCurrentURL: function(currentURL){
    $.ajax({
      url: 'http://localhost:3000/repositories/contributors',
      type: 'post',
      data: currentURL,
      crossDomain: true,
      xhrFields: {
        withCredentials: true
      }
    }).done(function(response){
      debugger
      console.log("made it!")
    });
  },

  getDonationAmounts_Github: function(){
    var donationAmounts = []
   $(".gift-amount-field").each( function(){ 
     donationAmounts.push(($(this).val());
   });
  }.

  calcMoneyDisplay: function(amount, contribsCommitsArray, callback){
    var totalCommitsAmount = contribsCommitsArray.reduce(Helpers.add, 0)
    var returnArray = [] // this is going to be in format [amountOfMoney, amountOfMoney, amountOfMoney]
    for (var i = 0; i < contribsCommitsArray.length; i++){
      var percentage = contribsCommitsArray[i]/totalCommitsAmount
      contribAmount = amount * percentage
      returnArray[i] = contribAmount.toFixed(2)
    }
    callback(returnArray)
    // run down of waht happens here
    // Get list of contributions, find total amount of commits
    // Each persons commits converted to precent of total commits and that precent is then taken as a percent of the total amount of money being given
    // insert the resulting number into a array this array is ordered from first to last of how the contributers are displated 
    // View function then cycles through this display and the contib objects and fills in the appropriate amount
  },

}


var View = {


  displayLogin: function(){

  },

  displayUserProfile: function(userData){
    $(".login-page").css("display", "none");
    $(".user-picture").attr("src", userData["github_avatar_url"]);
    $(".user-name").html("<h2>" + userData["github_username"] + "</h2>");
    var apiUsernames = [
    [userData['twitterData'],"Twitter"], 
    [userData['github_username'], "Github"], 
    [userData['coinbase_name'], 'Coinbase']]

    $(".api-username").each(function(index) {
      // All this does is cycle through api-username prebuilt list and go through apiUsernames and fills it in for the profile view
      if (apiUsernames[index][0] != null){
        $(this).html( apiUsernames[index][1] + ": <a href=\"#\" class=\"configured-api\" data-api-name=\""+ apiUsernames[index][1] + "\">"+apiUsernames[index][0]+"</a>");
      } else {
        $(this).html( apiUsernames[index][1] + ": <a href=\"#\" class=\"configure-api\" data-api-name=\""+ apiUsernames[index][1] + "\">Configure</a>")
      }
    })
    Model.getCurrentTabUrl(Model.getRepoContribs)
  },

  fillInContribAmounts: function(contribeAmountsArray) {
    var contributersInputHTMLObjects = $(".contirbuter .gift-amount-field")
    for ( var i = 0; i < contribeAmountsArray.length; i++) {
     contributersInputHTMLObjects[i].value = contribeAmountsArray[i]
    }
  },


  startListeners: function(){
  $('#signin').on('click', function(event){
      event.preventDefault();
      Model.apiAuthentication("Github");
    })

  $('.send-gift').on('click', function(event){
    event.preventDefault();
    $(this);
  });

  $(document).on('click','.configure-api', function(event){
    event.preventDefault();
    Model.apiAuthentication($(this).data('apiName'));
  });

  $(document).on('click', ".github-send-all", function(event){
    event.preventDefault();
    $.ajax({
      type: "POST",
      url: "htts://localhost/payment",
      data: {commitsArray: commitsArray, contribsUserNames: contribsUserNames}
    }).done(function(response){
      debugger
    })
  })

  $(document).on('click','.configured-api', function(event){
    debugger
  });

  $(document).on('input', '.total-gift-amount', function(event){
    event.preventDefault()
    commitsArray = []
    $(".contirbuter h4").each( function(){ 
      commitsArray.push(Number.parseInt($(this).html()))
    });
    Model.calcMoneyDisplay(
    $(this).val(), // value of amount user wants to give
    commitsArray, // contribs commits array
    View.fillInContribAmounts // callback
    ); 
  })

  },

  displayRepoContribs: function(list){
    $('.amount-selection').append("<button class=\"amount-less\"> <- </button> <input type=\"text\" class=\"gift-amount-field total-gift-amount\" placeholder=\"$\"> <button class=\"amount-less\"> -> </button> <button class=\"github-send-all\">Send</button>")
    contribsUserNames = []

    if (list === false){
      $('.contributers-display').append("sorry this is not a searchable URL")
    } else {
      for ( var i = 0; i < list.length; i++){
        var currentUser = i;
        var userName = list[currentUser][0][1];
        var userPhotoURL = list[currentUser][2][1];
        var userRawURL = list[currentUser][4][1];
        var userProfileUrl = list[currentUser][5][1];
        var userContributions = list[currentUser][17][1];

        $('.contributers-display').append("\
          <div class=\"contirbuter\">\
            <a href=\" "+ userProfileUrl +" \">"+ userName+" </a>\
            <h4>"+ userContributions+"</h4>\
            <input type=\"text\" class=\"gift-amount-field\" size=\"10\" placeholder=\"$\">\
            <input type=\"submit\" value=\"send\" class=\"send-gift\">\
          </div>"
          )
        contribsUserNames.push(userName) // this is for the checkContribs call
        }   
    }
    // Model.checkContribs(contribsUserNames)
    // This is to load up the green check mark or red x next to a contributer to indicate weather they have signed up for Thanks!
  },
}

// chrome.browserAction.onClicked.addListener
document.addEventListener('DOMContentLoaded', function() {
  View.startListeners();
  Model.getUserKey("github", Model.startup)


  // for developing offline
  var userName1 = "Test1";
  var userProfileUrl1 = "https://facebook.com";
  var userContributions1 = 15;

  var userName2 = "Test2";
  var userProfileUrl2 = "https://twitter.com";
  var userContributions2 = 34;
   $('.contributers-display').append("\
        <div class=\"contirbuter\">\
          <a href=\" "+ userProfileUrl1 +" \">"+ userName1 +" </a>\
          <h4>"+ userContributions1 +"</h4>\
          <input type=\"text\" class=\"gift-amount-field\" size=\"10\" placeholder=\"$\">\
          <input type=\"submit\" value=\"send\" class=\"send-gift\">\
        </div>"
        )
   $('.contributers-display').append("\
        <div class=\"contirbuter\">\
          <a href=\" "+ userProfileUrl2 +" \">"+ userName2 +" </a>\
          <h4>"+ userContributions2 +"</h4>\
          <input type=\"text\" class=\"gift-amount-field\" size=\"10\" placeholder=\"$\">\
          <input type=\"submit\" value=\"send\" class=\"send-gift\">\
        </div>"
        )
});

// TODO: 
// - Fix index of undifined for tabs-query if user onyl has one tab open




