import React, { Component } from 'react';
import { Chart } from 'react-google-charts';
import PropTypes from 'prop-types';
import './App.css';
// import { CandleStickChart  } from 'react-d3';
import moment from 'moment';
// import {ma} from 'moving-averages';
var sma = require('sma');

class App extends Component {
  constructor() {
    super();

    this.state = {
      currencies: null,
      timestamp: null,
      selectedSymbol: "",
      startDate: "",
      endDate: "",
      closingPrices: [],
      openingPrices: [],
      highPrices: [],
      lowPrices: [],
      smaRange: 2,
      smaPrices: [],
      dates: [],
      chartData: []
    };

    this.symbolChanged = this.symbolChanged.bind(this);
    this.calculate = this.calculate.bind(this);
    this.dateChanged = this.dateChanged.bind(this);
    this.smaRangeChanged = this.smaRangeChanged.bind(this);
  }

  componentWillMount(){
    fetch('https://min-api.cryptocompare.com/data/all/coinlist')
    .then(response => response.json())
    .then(json => {
      var defaultWatchlistNames = [];
      var defaultWatchlistIds = json.DefaultWatchlist.CoinIs.split(",");

      for(var currency in json.Data) {
        if (defaultWatchlistIds.includes(json.Data[currency].Id)) {
          defaultWatchlistNames.push(currency);
        }
      }

      this.setState({currencies: defaultWatchlistNames});
      this.setState({selectedSymbol: defaultWatchlistNames[0]});
    });
  }

  symbolChanged(e) {
    this.setState({selectedSymbol: e.target.value});
    this.setState({chartData: []});
  }

  calculate(e) {
    e.preventDefault();

    var symbol = this.state.selectedSymbol;
    var smaRange = this.state.smaRange;
    var startDate = moment(this.state.startDate,'YYYY/MM/DD');
    var endDate = moment(this.state.endDate,'YYYY/MM/DD');
    var diffDays = endDate.diff(startDate, 'days');
    var timestamp = parseInt(moment(endDate).format("X")) + 86400;
    var endPointUrl = `https://min-api.cryptocompare.com/data/histoday?fsym=${symbol}&tsym=EUR&limit=${diffDays - 1}&aggregate=1&toTs=${timestamp}`;
    console.log(endPointUrl);

    fetch(endPointUrl).then(res => res.json())
      .then(json => {
        this.setState({closingPrices: json.Data.map(day => day.close)});
        this.setState({openingPrices: json.Data.map(day => day.open)});
        this.setState({highPrices: json.Data.map(day => day.high)});
        this.setState({lowPrices: json.Data.map(day => day.low)});
        this.setState({dates: json.Data.map(day => moment.unix(day.time).format("YYYY/MM/DD"))});
      })
      .then(() => {
        this.setState({
          smaPrices: sma(this.state.closingPrices, smaRange).map(n => parseFloat(n))
        });
      })
      .then(() => {
        var dates = this.state.dates;
        var lowPrices = this.state.lowPrices;
        var highPrices = this.state.highPrices;
        var openingPrices = this.state.openingPrices;
        var closingPrices = this.state.closingPrices;
        var SMAs = this.state.smaPrices;
        var smaRange = this.state.smaRange;

        var newData = [['Date', 'Low', 'Open', 'Close', 'High', `SMA(${smaRange})`, 'Closing Price']];
        for (var i = 0; i < this.state.dates.length; i++) {
          if(i < smaRange - 1) {
            if(this.state.closingPrices[i] > this.state.openingPrices[i]) {
              newData.push([dates[i], lowPrices[i], openingPrices[i], closingPrices[i], highPrices[i], null, closingPrices[i]]);
            }
            else {
              newData.push([dates[i], highPrices[i], openingPrices[i], closingPrices[i], lowPrices[i], null, closingPrices[i]]);
            }
          }
          else {
            if(this.state.closingPrices[i] > this.state.openingPrices[i]) {
              newData.push([dates[i], lowPrices[i], openingPrices[i], closingPrices[i], highPrices[i], SMAs[i - smaRange + 1], closingPrices[i]]);
            }
            else {
              newData.push([dates[i], highPrices[i], openingPrices[i], closingPrices[i], lowPrices[i], SMAs[i - smaRange + 1], closingPrices[i]]);
            }
          }
        }
        this.setState({chartData: newData});
      });
  }

  dateChanged(date, e) {
    date === 'startDate' ?
      this.setState({startDate: e.target.value}) :
      this.setState({endDate: e.target.value});

    this.setState({chartData: []});
  }

  smaRangeChanged(e) {
    this.setState({smaRange: parseInt(e.target.value)});
    this.setState({chartData: []});
  }

  render() {
    var props = {
      chartType:"ComboChart",
      data: this.state.chartData,
      width:"100%",
      height: 1000,
      options:{
        title:`Candlestick & SMA(${this.state.smaRange}) & Closing price Chart for: ${this.state.selectedSymbol} in EUR(\u20AC)`,
        seriesType: "candlesticks",
        series: {
          1: {
            type: "line"
          },
          2: {
            type: 'line'
          }
        },
        legend:"none"
      }
    };

    var marginRight = {
      marginRight: 2 + 'em'
    };

    var marginTop = {
      marginTop: 1 + 'em'
    };

    return (
      <div className="App">
        <form onSubmit={this.calculate} style={marginTop}>
          <label htmlFor="symbol"><b>Select Cryptocurrency: </b></label>
          <select id="symbol" value={this.state.selectedSymbol} style={marginRight} onChange={this.symbolChanged}>
            {this.state.currencies && this.state.currencies.map(curr =>
                <option value={curr} key={curr}>{curr}</option>)
            }
          </select>
          <label htmlFor="startDate"><b>Start Date: </b></label>
          <input id="startDate" type="date" style={marginRight} onChange={this.dateChanged.bind(this, 'startDate')} />
          <label htmlFor="endDate"><b>End Date: </b></label>
          <input id="endDate" type="date" style={marginRight} onChange={this.dateChanged.bind(this, 'endDate')} />
          <label htmlFor="smaRange">SMA(<b>Range</b>): </label>
          <input id="smaRange" type="number" value={this.state.smaRange} min="1" style={marginRight} onChange={this.smaRangeChanged} />
          <input type="submit" value="Calculate" />
        </form>

        {(this.state.chartData.length > 0) && <Chart  {...props} />}
      </div>
    );
  }
}

export default App;
