import React, { Component, useState, useEffect } from "react";
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import Addresse from "./Addresse.js";

import "./App.css";


class App extends Component {
  state               = { addresses:null, events:null, nbVoters:null, MaxVoters:null, nbProposals:null, MaxProposals:null, proposals:null, oneProposal:null, totalVotes:0, voter:null, winner:null, workflowStatus:null, owned:null, web3:null, accounts:null, contract:null};
  enumWorkflowStatus  = ["Enregistrement des votants","Enregistrement des propositions","Fin de l'enregistrement des propositions","Session de vote","Fin de session de vote","Session de résultats"];
  tempAddr            =[];
  componentDidMount   = async () => {
    try {
      const web3            = await getWeb3();
      const accounts        = await web3.eth.getAccounts();
      const networkId       = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId];
      const instance        = new web3.eth.Contract(VotingContract.abi,deployedNetwork && deployedNetwork.address);

      let nbProposals       = await instance.methods.getNbProposals().call();
      let nbVoters          = await instance.methods.getNbVoters().call();
      const owner           = await instance.methods.owner().call();
      let workflowStatus    = await instance.methods.getWorkflowStatus().call();

      /**
       * Boucle permettant de récupérer la liste des propositions
       */
       let proposals=[];
      for (let i=0;i<nbProposals;i++){
        proposals.push(await instance.methods.getOneProposal(i).call({from:accounts[0]}));
      }
      let owned =accounts[0]==owner;

      let options   = {
        fromBlock:  0,                  //Number || "earliest" || "pending" || "latest"
        toBlock:    'latest'
      };
      const listAddress = await instance.getPastEvents('VoterRegistered',options);

      let listEvents  = await instance.getPastEvents('MaxVoters',options);
      this.setState({addresses:listAddress, events:listEvents, nbProposals, proposals, nbVoters,workflowStatus, web3, accounts, owned, contract: instance });

      let totalVotesCount = await instance.getPastEvents('Voted',options);

      /**
       * Récupération des emit directement depuis le smart contract pour réutilisation en front :
       */
      this.setState({totalVotes:totalVotesCount});
      this.setState({MaxVoters:this.state.events.map((addresse)=>(addresse.returnValues.MaxVoters))});
      listEvents  = await instance.getPastEvents('MaxProposals',options);
      this.setState({events:listEvents});
      this.setState({MaxProposals:listEvents.map((addresse)=>(addresse.returnValues.MaxProposal))});
      this.setState({events:await instance.getPastEvents('WorkflowStatusChange',options)});
      /**
       * Récupération du nombre de vote et du gagnant avec condition de positionnement dans le workflow
       */


      /**
       * En cours de déploiement
       */
      /*
      if (this.state.workflowStatus>=4){
        this.setState({totalVotes : await instance.methods.getTotalVotes().call()});
      }*/


      
      /**
       * Afin de réutiliser efficacement les addresses, un tableau dynamique est utilisé.
       */

      //console.log(listAddress[0].returnValues.voterAddress);
      for (let i=0;i<listAddress.length;i++){
        this.tempAddr.push(listAddress[0].returnValues.voterAddress);
      }
    } catch (error) {
      alert(`Failed to load web3, accounts, or contract. Check console for details.`,);
      console.error(error);
    }
  };

  runDefineMaxVoters = async ()=>{
    const {accounts, contract}  =this.state;
    const MaxVoters             =document.getElementById("MaxVoters").value;

    if(MaxVoters<2||MaxVoters>100||MaxVoters==null){
      alert(`Please enter a value beetween 2 and 100.`);

    }else{
      await contract.methods.defineMaxVoters(MaxVoters).send({from:accounts[0]});

      const listEvents=await contract.getPastEvents('MaxVoters');
      this.setState({event:listEvents});
    }
    window.window.location.reload();
  };

  runAddVoter = async ()=>{
      const {accounts, contract}=this.state;
      let address=document.getElementById("adressevotant").value;
      if(this.state.web3.utils.isAddress(address)){
        if(this.state.nbVoters<this.state.MaxVoters){
          let isListed = new Boolean(false);
          for (let i=0;i<=this.tempAddr.length;i++){
            //console.log(this.tempAddr[i]);
            if(address==this.tempAddr[i]){
              isListed=true;
            }
          if (isListed==true){
            alert(`Impossible : Adresse déjà inscrite !`);
          }else{
            await contract.methods.addVoter(address).send({from:accounts[0]});

            let options   = {
              fromBlock:  0,                  //Number || "earliest" || "pending" || "latest"
              toBlock:    'latest'
            };
            const getEvent=await contract.getPastEvents('VoterRegistered',options);
            this.setState({event:getEvent});
            window.location.reload();
            }
          }
        }else{
          alert(`Nombre maximum de votant atteint !`);
        }
      }else{
        alert(`Merci de renseigner une adresse valide`);
      }
  };

  runDefineMaxProposals = async ()=>{

    const {accounts, contract}=this.state;
    const MaxProposals=document.getElementById("MaxProposals").value;

    if(MaxProposals<2||MaxProposals>100||MaxProposals ==null){
      alert(`Please enter a value beetween 2 and 100.`);
    }else{
      await contract.methods.defineMaxProposals(MaxProposals).send({from:accounts[0]});

      const listEvents=await contract.getPastEvents('MaxProposals');
      this.setState({events:listEvents});
    }
    window.location.reload();
  };

  runAddProposal = async ()=>{

    const {accounts, contract}=this.state;
    let Proposal=document.getElementById("Proposal").value;
    await contract.methods.addProposal(Proposal).send({from:accounts[0]});

    let options   = {
      fromBlock:  0,                  //Number || "earliest" || "pending" || "latest"
      toBlock:    'latest'
    };

    const getEvent = await contract.getPastEvents('ProposalRegistered',options);
    this.setState({event:getEvent});
    window.location.reload();
};
  runVoteForProposal= async ()=>{
    const {accounts, contract}=this.state;
    let idProposal=document.getElementById("idProposal").value;

    if (this.state.web3.utils.isAddress(accounts[0])){
      this.setState({voter:await contract.methods.getVoter(accounts[0]).call({from:accounts[0]})});
    }
    if(this.state.voter.hasVoted==true){
      alert("vous avez déjà voté !");
    }else{
      await contract.methods.setVote(idProposal).send({from:accounts[0]});
      alert("Vote enregistré!");
    }
    window.location.reload();
  }
  /**
   * this section is about all functions used to interact with the SC
   */
  runNextStep = async ()=>{
    const {accounts, contract}=this.state;
    if (this.state.workflowStatus==0){
      await contract.methods.startProposalsRegistering().send({from:accounts[0]});
    }
    else if (this.state.workflowStatus==1){
      await contract.methods.endProposalsRegistering().send({from:accounts[0]});
    }
    else if (this.state.workflowStatus==2){
      await contract.methods.startVotingSession().send({from:accounts[0]});
    }
    else if (this.state.workflowStatus==3){
      await contract.methods.endVotingSession().send({from:accounts[0]});
    }
    else if (this.state.workflowStatus==4){
      await contract.methods.tallyVotesDraw().send({from:accounts[0]});
    }
    let workflowStatus = await contract.methods.getWorkflowStatus().call();
    this.setState({workflowStatus});
    window.location.reload();
  }

  /**
   * Getters particuliers avec paramètres
   */
  getVoter = async (address) =>{
    const {accounts, contract}=this.state;
    if (this.state.web3.utils.isAddress(address)){
      this.setState({voter:await contract.methods.getVoter(address).call({from:accounts[0]})});
    }
  }

  getOneProposals = async (id) =>{
    const {accounts, contract}=this.state;
    if (id<=this.state.nbProposals&&id>=0){
      this.setState({oneProposal:await contract.methods.getOneProposal(1).call({from:accounts[0]})});
      return(
        <div>{this.state.oneProposal}</div>
      );
    }else{
      return(
        <div>L'id renseigné ne retourne aucun enregistrement, veuillez vérifier votre saisie.</div>
      );
    };
  }

  /**
   * Fonction non opérationnelles pour l'instant
   */
  /*
  getTotalVotes(){
    if(this.state.workflowStatus>3){
      return(
        <div>
          <h3>Nombre total de votes comptabilisés : &nbsp;{this.state.totalVotes.length+1}</h3>
        </div>
      );
    }
  }
  sendWinnerCalculation = async () =>{
    const {accounts, contract}=this.state;
      await contract.methods.tallyVotesDraw().send({from:accounts[0]});
      window.location.reload();
  }
  getWinner(){
    if(this.state.workflowStatus==5){
      
      return(
        <div><h1>Le gagnant est : &nbsp;{this.state.winner}</h1></div>
      );
    }
  }
  */

  /**
   * admin render parts
   */
  adminTextMessage(){
    return(
      <div>
        <h1>Tu es l'admin du système de vote, tu as acces à toutes les informations et interractions du SC !</h1>
      </div>
    );
  }

  adminDefineMaxVoters(){
    if(this.state.MaxVoters<2 && this.state.workflowStatus==0){
      return(
        <div>
          <p>
          <form>
            <label for="MaxVoters">Définir le nombre de votant : </label>
            <input type="text" id="MaxVoters" placeholder="Nb de votant"/>&nbsp;
            <input type="button" onClick={this.runDefineMaxVoters}value="Ajouter"/>
          </form>
          </p>
        </div>
      );
    };
  }

  adminAddingVotants(){
    if(this.state.nbVoters<=this.state.MaxVoters && this.state.workflowStatus==0){
      return(
        <div>
          <div>Nombre max de votants : {this.state.events.map((addresse)=>(
            <span>
              {addresse.returnValues.MaxVoters}
            </span>))}
          </div>
          <div>
            <p>
              <form>
                <label for="address">Ajouter un votant : </label>
                <input type="text" id="adressevotant" required minLength="42" placeholder="adresse 0x du votant"/>&nbsp;
                <input type="button" onClick={this.runAddVoter}value="Ajouter"/>
              </form>
            </p>
          </div>
        </div>
      );
    }else if(this.state.workflowStatus==0 && this.state.nbVoters==this.state.MaxVoters &&this.state.MaxVoters!=null) {
      return(
        <div>Nombre max de votant inscrits atteint, passez à l'étape suivante !</div>
      );
    }
  }

  adminNextStepSection(){
    if (this.state.workflowStatus==0 && this.state.nbVoters>=2){
      return(
        <form>
          <label for="nextStep">Passer à l'étape d'ajout des propositions ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if (this.state.workflowStatus==1 && this.state.nbProposals>=2){
      return(
        <form>
          <label for="nextStep">Mettre fin à l'étape de l'ajout des propositions ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if ((this.state.workflowStatus==2)){
      return(
        <form>
          <label for="nextStep">Passer à l'étape de vote ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if ((this.state.workflowStatus==3)){
      return(
        <form>
          <label for="nextStep">Mettre fin au vote ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if ((this.state.workflowStatus==4)){
      return(
        <form>
          <label for="nextStep">Passer à l'étape des résultats ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
  }

  adminDefineMaxProposals(){
    if(this.state.MaxProposals<2 && this.state.workflowStatus==1){
      return(
        <div>
          <p>
            <form>
              <label for="MaxProposals">Définir le nombre de propositions : </label>
              <input type="text" id="MaxProposals" placeholder="Nb de propositions"/>&nbsp;
              <input type="button" onClick={this.runDefineMaxProposals}value="Ajouter"/>
            </form>
          </p>
        </div>
      );
    };
  }
  adminAllowCalculatingWinner(){
    if(this.state.workflowStatus==5){
      return(
        <div>
          <p>
          <form>
              <label for="CalculateWinner"><h2>Appuyez sur le bouton pour terminer :&nbsp;</h2></label>
              <input type="button" onClick={this.sendWinnerCalculation}value="Qui est le gagnant ?"/>
            </form>
          </p>
        </div>
      );
    }
  }

  /**
   * common render parts
   */
  commonLodingWeb3(){
    return(
      <div>
        <h1>Loading Web3, accounts, and contract...<br/></h1>
        <h1>Please check that your metamask is loged !</h1>
      </div>
    );
  }
  commonStatus(){
    return(
      <div>
        <h1>Bienvenue sur le système de vote !</h1>
        <h2>Ton addresse metamask est :<Addresse addr={this.state.accounts}/></h2> {/*permet d'afficher l'adresse du compte utilisé*/}
        <p>Nombre de votants enregistrés : {this.state.nbVoters} sur un maximum de {this.state.MaxVoters}.</p>
        <p>Nombre de propositions enregistrées : {this.state.nbProposals} sur un maximum de {this.state.MaxProposals}.</p>
        <p><em><strong>Statut actuel de la session de vote : {this.enumWorkflowStatus[this.state.workflowStatus]}</strong></em></p>
      </div>
    );
  }
  commonVoterList(){
    if(this.state.nbVoters>0){
      return(
        <div>
          <p>
            <strong>Liste actuelle des votants :</strong>
            <table>
            {this.state.addresses.map((addresse)=>(
              <tr><div>{addresse.returnValues.voterAddress}</div></tr>
              ))}
            </table>
          </p>
        </div>
      );
    }
  }
  commonGetProposalList(){
    if(this.state.nbProposals>0){
      return(
        <div>
        <p>
          <strong>Liste actuelle des Propositions :</strong>
          <table><tr><td><div>Proposition :</div></td><td><div>Nb de vote :</div></td></tr>
          {this.state.proposals.map((proposals)=>(
            <tr><td><div>{proposals[0]}</div></td><td><div>{proposals[1]}</div></td></tr>
            ))}
          </table>
        </p>
      </div>
      );
    }
  }
  commonMessageAboutWorkFlow(){
    if (this.state.workflowStatus==0){
      return(<div><p><strong>Session d'enregistrement des votants en cours, merci d'attendre la session "{this.enumWorkflowStatus[(parseInt(this.state.workflowStatus))+1]}" pour ajouter des proposition.</strong></p></div>);
    }

    if(this.state.workflowStatus==1&&this.state.MaxProposals<2){
      return(<div><p><strong>Attendez que l'admin définisse le nombre de propositions maximal.</strong></p></div>);
    }
    if (this.state.workflowStatus==1&&this.state.MaxProposals!=0&&this.state.nbProposals<this.state.MaxProposals){
      return(<div><p><strong>Vous pouvez désormais enregistrer des propositions.</strong></p></div>);
    }
    if (this.state.workflowStatus==1&&this.state.nbProposals==this.state.MaxProposals){
      return(<div><p><strong>la liste des proposition est complete, attendez que l'admin lance la session "{this.enumWorkflowStatus[(parseInt(this.state.workflowStatus))+2]}" pour pouvoir voter.</strong></p></div>);
    }
    if (this.state.workflowStatus==2){
      return(<div><p><strong>Session d'enregistrement des propositions terminée, veuillez attendre le début de la session "{this.enumWorkflowStatus[(parseInt(this.state.workflowStatus))+1]}" pour pouvoir voter.</strong></p></div>);
    }
    if (this.state.workflowStatus==3){
      return(<div><p><strong>La session de vote à débuté, vous pouvez voter pour une seule proposition.</strong></p></div>);
    }
    if (this.state.workflowStatus==4){
      return(<div><p><strong>La session de vote est terminée, veuillez attendre la session "{this.enumWorkflowStatus[(parseInt(this.state.workflowStatus))+1]}" pour l'affichage des résultats.</strong></p></div>);
    }
    if (this.state.workflowStatus==5){
      return(<div><p><strong>Résultat du vote :</strong></p></div>);
    }
  }
  commonSetProposal(){
    if(this.state.workflowStatus==1&&this.state.MaxProposals!=0&&this.state.nbProposals<this.state.MaxProposals){
      return(
        <div>
          <p>
            <form>
              <label for="Proposal">Définir une proposition : </label>
              <input type="text" id="Proposal" placeholder="Proposition?"/>&nbsp;
              <input type="button" onClick={this.runAddProposal} value="Ajouter"/>
            </form>
          </p>
        </div>
      );
    }
  }
  commonShowProposals(){
    let i=0;
    if(this.state.workflowStatus==3){
      return(
        <div>
          <table>
            <tr>
              <td>
                <div>Voter pour:</div>
              </td>
            </tr>
            {this.state.proposals.map((proposals)=>(
              <tr>
                <td>
                  <div>
                    <form>
                      <label for="idProposal">{proposals[0]} </label>
                      <input type="button" onClick={this.runVoteForProposal}value="Voter !"/>
                      <input type="hidden" id="idProposal" value={i++}/>
                    </form>
                  </div>
                </td>
              </tr>
              )
            )}
          </table>
      </div>
      );
    }
  }

  render() {
    if (!this.state.web3) {
      return (
        <div className="App">
          {this.commonLodingWeb3()}
        </div>
      );
    }
    if(this.state.owned){
      return (
        <div className="App">
          {this.adminTextMessage()}
          {this.commonStatus()}
          {this.adminAddingVotants()}
          {this.adminDefineMaxVoters()}
          {this.adminNextStepSection()}
          {this.adminDefineMaxProposals()}
          {this.commonVoterList()}
          {this.commonSetProposal()}
          {this.commonGetProposalList()}
          {this.commonShowProposals()}
          {/*this.getTotalVotes()*/}
          {/*this.adminAllowCalculatingWinner()*/}
          {/*this.getWinner()*/}
        </div>
      );
    }else{
      return(
        <div className="App">
          {this.commonStatus()}
          {this.commonVoterList()}
          {this.commonMessageAboutWorkFlow()}
          {this.commonSetProposal()}
          {this.commonGetProposalList()}
          {this.commonShowProposals()}
          {/*this.getTotalVotes()*/}
          {/*this.getWinner()*/}
          </div>
      );
    }
  }
}
export default App;
