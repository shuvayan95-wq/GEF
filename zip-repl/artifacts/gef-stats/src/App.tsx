import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Public Pages
import { Home } from "@/pages/public/Home";
import { Players } from "@/pages/public/Players";
import { PlayerProfile } from "@/pages/public/PlayerProfile";
import { Teams } from "@/pages/public/Teams";
import { Matches } from "@/pages/public/Matches";
import { Compare } from "@/pages/public/Compare";
import { Market } from "@/pages/public/Market";
import { FFP } from "@/pages/public/FFP";
import { H2H } from "@/pages/public/H2H";
import { Leagues } from "@/pages/public/Leagues";
import { Trophies } from "@/pages/public/Trophies";
import { Transfers } from "@/pages/public/Transfers";
import { Taglist } from "@/pages/public/Taglist";
import { Cards } from "@/pages/public/Cards";

// Admin Pages
import { Login } from "@/pages/admin/Login";
import { Dashboard } from "@/pages/admin/Dashboard";
import { ManagePlayers } from "@/pages/admin/ManagePlayers";
import { ManageTeams } from "@/pages/admin/ManageTeams";
import { ManageMatches } from "@/pages/admin/ManageMatches";
import { ManageAwards } from "@/pages/admin/ManageAwards";
import { ManageLeagues } from "@/pages/admin/ManageLeagues";
import { ManageTrophies } from "@/pages/admin/ManageTrophies";
import { ManageFFP } from "@/pages/admin/ManageFFP";
import { ManageBudget } from "@/pages/admin/ManageBudget";
import { ManageBallonDor } from "@/pages/admin/ManageBallonDor";
import { BallonDor } from "@/pages/public/BallonDor";
import { HallOfFame } from "@/pages/public/HallOfFame";
import { CeremonyEntry } from "@/pages/public/CeremonyEntry";
import { CeremonyLive } from "@/pages/public/CeremonyLive";
import { ManageCeremony } from "@/pages/admin/ManageCeremony";
import { ImportData } from "@/pages/admin/ImportData";
import { ManageTransfers } from "@/pages/admin/ManageTransfers";
import { ManageCMS } from "@/pages/admin/ManageCMS";
import { ManageGCC } from "@/pages/admin/ManageGCC";
import { ManageCards } from "@/pages/admin/ManageCards";
import { ManageTaglist } from "@/pages/admin/ManageTaglist";
import { ManageHallOfFame } from "@/pages/admin/ManageHallOfFame";
import { EfootballWorld } from "@/pages/public/EfootballWorld";
import { ManageEfootballWorld } from "@/pages/admin/ManageEfootballWorld";
import { ManageSportsDesk } from "@/pages/admin/ManageSportsDesk";
import { ManageContracts } from "@/pages/admin/ManageContracts";
import { TeamProfile } from "@/pages/public/TeamProfile";
import { GCCHub } from "@/pages/public/GCCHub";
import { GCCTournament } from "@/pages/public/GCCTournament";
import { GCCDraw } from "@/pages/public/GCCDraw";
import { GCCStandings } from "@/pages/public/GCCStandings";
import { GCCFixtures } from "@/pages/public/GCCFixtures";
import { GCCBracket } from "@/pages/public/GCCBracket";
import { PartnerDetail } from "@/pages/public/PartnerDetail";
import { AISportsDesk } from "@/pages/public/AISportsDesk";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    }
  }
});

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/players" component={Players} />
      <Route path="/players/:id" component={PlayerProfile} />
      <Route path="/teams" component={Teams} />
      <Route path="/teams/:id" component={TeamProfile} />
      <Route path="/matches" component={Matches} />
      <Route path="/compare" component={Compare} />
      <Route path="/market" component={Market} />
      <Route path="/ffp" component={FFP} />
      <Route path="/h2h" component={H2H} />
      <Route path="/leagues" component={Leagues} />
      <Route path="/trophies" component={Trophies} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/taglist" component={Taglist} />
      <Route path="/efootball-world" component={EfootballWorld} />
      <Route path="/cards" component={Cards} />
      <Route path="/partners/:id" component={PartnerDetail} />
      <Route path="/ballon-dor" component={BallonDor} />
      <Route path="/hall-of-fame" component={HallOfFame} />
      <Route path="/ceremony" component={CeremonyEntry} />
      <Route path="/ceremony/live" component={CeremonyLive} />

      <Route path="/ai-news" component={AISportsDesk} />

      {/* GEF Champions Cup */}
      <Route path="/gcc" component={GCCHub} />
      <Route path="/gcc/:id" component={GCCTournament} />
      <Route path="/gcc/:id/draw" component={GCCDraw} />
      <Route path="/gcc/:id/standings" component={GCCStandings} />
      <Route path="/gcc/:id/fixtures" component={GCCFixtures} />
      <Route path="/gcc/:id/bracket" component={GCCBracket} />
      
      {/* Admin Routes */}
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/players" component={ManagePlayers} />
      <Route path="/admin/teams" component={ManageTeams} />
      <Route path="/admin/matches" component={ManageMatches} />
      <Route path="/admin/awards" component={ManageAwards} />
      <Route path="/admin/leagues" component={ManageLeagues} />
      <Route path="/admin/trophies" component={ManageTrophies} />
      <Route path="/admin/ffp" component={ManageFFP} />
      <Route path="/admin/budget" component={ManageBudget} />
      <Route path="/admin/ballon-dor" component={ManageBallonDor} />
      <Route path="/admin/ceremony" component={ManageCeremony} />
      <Route path="/admin/transfers" component={ManageTransfers} />
      <Route path="/admin/cms" component={ManageCMS} />
      <Route path="/admin/import" component={ImportData} />
      <Route path="/admin/gcc" component={ManageGCC} />
      <Route path="/admin/cards" component={ManageCards} />
      <Route path="/admin/taglist" component={ManageTaglist} />
      <Route path="/admin/hall-of-fame" component={ManageHallOfFame} />
      <Route path="/admin/efootball-world" component={ManageEfootballWorld} />
      <Route path="/admin/sports-desk" component={ManageSportsDesk} />
      <Route path="/admin/contracts" component={ManageContracts} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
