import React, { Component, useState, useEffect } from "react";
import VotingContract from "./contracts/Voting.json";
import getWeb3 from "./getWeb3";
import Addresse from "./Addresse.js";

import "./App.css";


class App extends Component {

  state               = { addresses:null, events:null, nbVoters:null, MaxVoters:null, nbProposals:null, MaxProposals:null, oneProposal:null, /*totalVotes:null,*/ /*voter:0,*/ winner:0, workflowStatus:null, owned:null, web3:null, accounts:null, contract:null };
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
      let owned             =accounts[0]==owner;

      let options   = {
        fromBlock:  0,                  //Number || "earliest" || "pending" || "latest"
        toBlock:    'latest'
      };
      const listEvents  = await instance.getPastEvents('MaxVoters',options);
      const listAddress = await instance.getPastEvents('VoterRegistered',options);
      this.setState({addresses:listAddress, events:listEvents, nbProposals, nbVoters,workflowStatus, web3, accounts, owned, contract: instance });

      /**
       * Récupération de deux emit directement depuis le smart contract pour réutilisation en front :
       */

      this.setState({MaxVoters:this.state.events.map((addresse)=>(addresse.returnValues.MaxVoters))});
      this.setState({MaxProposals:this.state.events.map((addresse)=>(addresse.returnValues.MaxProposals))});

      /**
       * Récupération du nombre de vote et du gagnant avec condition de positionnement dans le workflow
       */

      if (this.state.workflowStatus>=4){
        this.setState({totalVotes : await instance.methods.getTotalVotes().call()});
      }
      if (this.state.workflowStatus==5){
        this.setState({winner:      await instance.methods.getWinner().call()});
      }

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
      this.setState({event:listEvents, MaxProposals});
    }
  };

  runAddProposal = async ()=>{

    const {accounts, contract}=this.state;
    let proposition=document.getElementById("proposition").value;
    await contract.methods.addProposal(proposition).send({from:accounts[0]});

    let options   = {
      fromBlock:  0,                  //Number || "earliest" || "pending" || "latest"
      toBlock:    'latest'
    };

    const getEvent = await contract.getPastEvents('ProposalRegistered',options);
    this.setState({event:getEvent});
};

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
  }

  /**
   * Getters particuliers avec paramètres
   */

   getVoter = async (id) =>{
    const {accounts, contract}=this.state;
    if (id<=this.state.nbVoters&&id>=0){
      this.setState({voter:await contract.methods.getVoter(id).call({from:accounts[0]})});
      return(
        <div>{this.state.voter}</div>
      );
    }else{
      return(
        <div>L'id renseigné ne retourne aucun enregistrement, veuillez vérifier votre saisie.</div>
      );
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
          <label for="nextStep">Passer à l'étape suivante ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if (this.state.workflowStatus==1 && this.state.nbProposals>=2){
      return(
        <form>
          <label for="nextStep">Passer à l'étape suivante ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
    if (this.state.workflowStatus==2 && this.state.nbVotes>=2){
      return(
        <form>
          <label for="nextStep">Passer à l'étape suivante ? :&nbsp;</label>
          <input type="button" id="nextStep" onClick={this.runNextStep} value="On y va !"/><br />
        </form>
      );
    }
  }

  adminDefineMaxProposals(){
    if(this.state.MaxProposals<=2 && this.state.workflowStatus==1){
      return(
        <div>
          <form>
            <label for="MaxProposals">Définir le nombre de propositions : </label>
            <input type="text" id="MaxProposals" placeholder="Nb de propositions"/>&nbsp;
            <input type="button" onClick={this.runDefineMaxProposals}value="Ajouter"/>
          </form>
        </div>
      );
    };
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

  commonMessageAboutWorkFlow(){
    if (this.state.workflowStatus==0){
      return(<div><p><strong>Session d'enregistrement des votants en cours, merci d'attendre la session "{this.enumWorkflowStatus[(parseInt(this.state.workflowStatus))+1]}" pour ajouter des proposition.</strong></p></div>);
    }
    if (this.state.workflowStatus==1&&this.state.MaxProposals!=0){
      return(<div><p><strong>Vous pouvez désormais enregistrer des propositions.</strong></p></div>);
    }
    if(this.state.workflowStatus==1&&this.state.MaxProposals<2){
      return(<div><p><strong>Attendez que l'admin définisse le nombre de propositions maximal.</strong></p></div>);
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

        </div>
      );
    }else{
      return(
        <div className="App">
          {this.commonStatus()}
          {this.commonVoterList()}
          {this.commonMessageAboutWorkFlow()}




        </div>
      );
    }
  }
}
export default App;
